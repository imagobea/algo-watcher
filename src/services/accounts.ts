import algosdk from "algosdk";
import type { PrismaClient } from "@prisma/client";
import {
  findByAddress,
  createWatchedAccount,
  createAccountState,
  listActiveWithState,
} from "../repos/accounts.js";
import { type AccountSnapshot, fetchAccount } from "../clients/algonode.js";

type AddAccountError = {
  ok: false;
  code: "invalid_address";
};

type AddAccountSuccess = {
  ok: true;
  created: boolean;
  address: string;
};

export type AddAccountResult = AddAccountSuccess | AddAccountError;

/**
 * addWatchedAccount tries to add an Algorand account to the watch list.
 * 
 * It first validates the address, then checks if it's already being watched.
 * If not, it attempts to fetch the current account state from the Algorand node.
 * If successful, it stores both the account and its initial state in the database.
 * If fetching the account state fails, it still adds the account without initial state.
 * 
 * @param prisma - Prisma client instance
 * @param address - Algorand account address to watch
 * @returns Promise resolving to AddAccountResult
 */
export async function addWatchedAccount(
  prisma: PrismaClient,
  address: string,
): Promise<AddAccountResult> {
  // Validate Algorand address
  if (!algosdk.isValidAddress(address)) {
    return { ok: false, code: "invalid_address" };
  }

  // Check if already exists
  const existing = await findByAddress(prisma, address);
  if (existing) return { ok: true, created: false, address };

  // Fetch account info from Algorand node
  let accountSnapshot: AccountSnapshot | null = null;
  try {
    accountSnapshot = await fetchAccount(address);
  } catch {
    accountSnapshot = null; // non-fatal, proceed
  }

  // Write to DB
  if (accountSnapshot) {
    await prisma.$transaction(async (tx) => {
      await createWatchedAccount(tx, address);
      await createAccountState(
        tx,
        address,
        accountSnapshot.amount,
        accountSnapshot.round,
      );
    });
    return { ok: true, created: true, address };
  }

  // Create without initial state
  await createWatchedAccount(prisma, address);
  return { ok: true, created: true, address };
}

export function listWatchedAccounts(prisma: PrismaClient) {
  return listActiveWithState(prisma);
}
