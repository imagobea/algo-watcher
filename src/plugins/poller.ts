import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import pLimit from "p-limit";
import { fetchAccount } from "../clients/algonode.js";
import {
  listActiveWithState,
  updateAccountStateCheckOk,
  updateAccountStateCheckKo,
} from "../repos/accounts.js";
import { createBalanceChangeNotification } from "../repos/notifications.js";

const INTERVAL_MS = Number(process.env.POLLER_INTERVAL_MS ?? 60 * 1000);
const MAX_CONCURRENCY = Number(process.env.POLLER_MAX_CONCURRENCY ?? 10);

export default fp(async (app: FastifyInstance) => {
  let isRunning = false;
  let timer: NodeJS.Timeout | null = null;

  async function tick() {
    if (isRunning) {
      app.log.warn("Poller is still running, skipping this tick");
      return;
    }

    isRunning = true;
    try {
      // Fetch active accounts
      const accounts = await listActiveWithState(app.prisma);
      app.log.debug({ addressCount: accounts.length }, "Starting poll cycle");

      const limit = pLimit(MAX_CONCURRENCY);
      await Promise.all(
        accounts.map((account) =>
          limit(async () => {
            try {
              const snapshot = await fetchAccount(account.address);
              const balanceDiff = account.state
                ? snapshot.amount - account.state.balanceMicro
                : BigInt(0);
              if (balanceDiff !== BigInt(0)) {
                const oldBalance = account.state
                  ? account.state.balanceMicro
                  : BigInt(0);
                const newBalance = snapshot.amount;
                await createBalanceChangeNotification(
                  app.prisma,
                  account.address,
                  oldBalance,
                  newBalance,
                  balanceDiff,
                  snapshot.round,
                );
                app.log.info(
                  { address: account.address, oldBalance, newBalance },
                  "Account balance changed",
                );
              }
              await updateAccountStateCheckOk(
                app.prisma,
                account.address,
                snapshot.amount,
                snapshot.round,
              );
            } catch (error) {
              // TODO: handle 429
              app.log.error(
                { address: account.address, error: (error as Error)?.message },
                "Error fetching account",
              );
              await updateAccountStateCheckKo(
                app.prisma,
                account.address,
                (error as Error).message,
              );
            }
          }),
        ),
      );
    } catch (error) {
      app.log.error(
        { error: (error as Error)?.message },
        "Error in poller tick",
      );
    } finally {
      isRunning = false;
      timer = setTimeout(tick, INTERVAL_MS);
    }
  }

  // Register shutdown hook
  app.addHook("onClose", async () => {
    if (timer) {
      clearTimeout(timer);
      app.log.info("Poller stopped");
    }
  });

  // Start the first tick
  timer = setTimeout(tick, 0);
  app.log.info(
    { interval: INTERVAL_MS, maxConcurrency: MAX_CONCURRENCY },
    "Poller started",
  );
});
