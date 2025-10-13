import type { PrismaClient } from '@prisma/client';
import algosdk, { type Account } from 'algosdk';
import { findByAddress, createWatchedAccount, createAccountState, listActiveWithState } from '../repos/accounts.js';
import type { AccountSnapshot } from '../clients/algonode.js';
import { fetchAccount } from '../clients/algonode.js';

export async function addWatchedAccount(prisma: PrismaClient, address: string) {
  // Validate Algorand address
  if (!algosdk.isValidAddress(address)) {
    return { ok: false, code: 'invalid_address' };
  }

  // Check if already exists
  const existing = await findByAddress(prisma, address);
  if (existing) return { ok: true, created: false, address };

  // Fetch account info from Algorand node
  let accountSnaphot: AccountSnapshot | null = null;
  try {
    accountSnaphot = await fetchAccount(address);
  } catch (err) {
    accountSnaphot = null; // non-fatal, proceed
  }

  // Write to DB
  if (accountSnaphot) {
    await prisma.$transaction(async (tx) => {
      await createWatchedAccount(tx, address);
      await createAccountState(
        tx,
        address,
        accountSnaphot.amount,
        accountSnaphot.round
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
