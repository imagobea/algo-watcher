import type { PrismaClient } from '@prisma/client';
import algosdk from 'algosdk';
import { findByAddress, createWatchedAccount, listActiveWithState } from '../repos/accounts.js';

export async function addWatchedAccount(prisma: PrismaClient, address: string) {
  // Validate Algorand address
  if (!algosdk.isValidAddress(address)) {
    return { ok: false as const, code: 'invalid_address' };
  }

  // Check if already exists
  const existing = await findByAddress(prisma, address);
  if (existing) return { ok: true as const, created: false, address };

  // Create new
  await createWatchedAccount(prisma, address);
  return { ok: true as const, created: true, address };
}

export function listWatchedAccounts(prisma: PrismaClient) {
  return listActiveWithState(prisma);
}
