import algosdk from "algosdk";
import { Prisma, type PrismaClient } from "@prisma/client";
import {
  findByAddress,
  createWatchedAccount,
  createAccountState,
  listActiveWithState,
} from "../repos/accounts.js";
import { fetchAccount } from "../clients/algonode.js";
import {
  DbWriteFailedError,
  InvalidAlgoAddressError,
} from "../utils/errors.js";
import type { FastifyBaseLogger } from "fastify";

export type AddAccountResult = {
  ok: true;
  created: boolean;
  address: string;
};

/**
 * addWatchedAccount adds an Algorand account to the watch list.
 *
 * It performs the following steps:
 * - Validates the Algorand address format
 * - Checks if the account is already being watched
 * - Fetches the current account state from the Algorand node (non-fatal)
 * - Writes the account and optional initial state to the db
 *
 * @param prisma - Prisma client instance
 * @param log - Fastify logger instance
 * @param address - Algorand account address to watch
 * @returns Promise resolving to AddAccountResult
 * @throws InvalidAlgoAddressError if the address is invalid
 * @throws DbWriteFailedError if there is a db write failure
 */
export async function addWatchedAccount(
  prisma: PrismaClient,
  log: FastifyBaseLogger,
  address: string,
): Promise<AddAccountResult> {
  // Validate Algorand address
  if (!algosdk.isValidAddress(address)) {
    log.warn(`Invalid Algorand address: ${address}`); // TODO: review logs and formatting
    throw InvalidAlgoAddressError();
  }

  // Check if already exists
  const existing = await findByAddress(prisma, address);
  if (existing) {
    log.debug(`Account already being watched: ${address}`);
    return { ok: true, created: false, address };
  }

  // Fetch account state from Algorand node
  const accountSnapshot = await fetchAccount(address);

  // Write to DB: account + optional state
  // Use transaction to ensure both writes succeed or fail together
  try {
    await prisma.$transaction(async (tx) => {
      await createWatchedAccount(tx, address);
      log.debug(`Created account: ${address}`);

      if (accountSnapshot.ok) {
        await createAccountState(
          tx,
          address,
          accountSnapshot.amount,
          accountSnapshot.round,
        );
        log.debug(`Created initial state: ${address}`);
      }
    });
    log.info(`Watching new account: ${address}`);
  } catch (err) {
    log.error(`Failed to watch account: ${address}`);
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      // Unique constraint failed, likely due to race condition
      return { ok: true, created: false, address };
    }
    throw DbWriteFailedError();
  }

  return { ok: true, created: true, address };
}

export function listWatchedAccounts(prisma: PrismaClient) {
  return listActiveWithState(prisma);
}
