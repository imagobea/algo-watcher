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

/**
 * pollerPlugin is a Fastify plugin that periodically checks the state of watched Algorand accounts.
 *
 * - Runs every INTERVAL_MS ms, limited to MAX_CONCURRENCY.
 * - Fetches active accounts, gets their state from Algonode, and updates the DB.
 * - Creates notifications on balance changes.
 * - Skips cycles if a previous one is still running.
 * - Registers a shutdown hook to stop polling on server close.
 *
 * TODO: poll stats, improve error handling, backoff on repeated errors.
 *
 * @param app - Fastify instance
 */
export default fp(async (app: FastifyInstance) => {
  let isRunning = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function tick() {
    if (isRunning) {
      app.log.warn("Previous poll still running, skipping");
      return;
    }

    isRunning = true;
    try {
      // Fetch active accounts
      const accounts = await listActiveWithState(app.prisma);
      app.log.debug({ addressCount: accounts.length }, "Starting poll cycle");

      // Limit concurrency, fetch accounts in parallel
      const limit = pLimit(MAX_CONCURRENCY);
      await Promise.all(
        accounts.map((account) =>
          limit(async () => {
            // Fetch account state from Algorand node
            const accountSnapshot = await fetchAccount(account.address);

            // Update account state with error
            if (!accountSnapshot.ok) {
              await updateAccountStateCheckKo(
                app.prisma,
                account.address,
                accountSnapshot.message,
              );
              return;
            }

            // Calculate balance change
            const oldBalance = account.state?.balanceMicro ?? BigInt(0);
            const newBalance = accountSnapshot.amount;
            const balanceDiff = newBalance - oldBalance;

            // TODO: fix - should be in a transaction
            // If balance changed, create notification
            if (balanceDiff !== BigInt(0)) {
              await createBalanceChangeNotification(
                app.prisma,
                account.address,
                oldBalance,
                newBalance,
                balanceDiff,
                accountSnapshot.round,
              );
              app.log.info(
                { address: account.address, oldBalance, newBalance },
                "Account balance changed",
              );
            }

            // Update account state
            await updateAccountStateCheckOk(
              app.prisma,
              account.address,
              accountSnapshot.amount,
              accountSnapshot.round,
            );
          }),
        ),
      );
    } catch (err) {
      app.log.error({ error: (err as Error)?.message }, "Error in poller tick");
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
