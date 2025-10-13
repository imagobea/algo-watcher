import type { PrismaClient } from "@prisma/client";
import algosdk from "algosdk";
import {
  findByAddress,
  createWatchedAccount,
  createAccountState,
  listActiveWithState,
} from "../repos/accounts.js";
import type { AccountSnapshot } from "../clients/algonode.js";
import { fetchAccount } from "../clients/algonode.js";

export async function addWatchedAccount(prisma: PrismaClient, address: string) {
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
