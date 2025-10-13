import type { AccountState, Prisma, PrismaClient, WatchedAccount } from '@prisma/client';

type DB = PrismaClient | Prisma.TransactionClient;

export async function findByAddress(prisma: DB, address: string) {
  return prisma.watchedAccount.findUnique({ where: { address } });
}

export async function createWatchedAccount(
  prisma: DB,
  address: string
): Promise<WatchedAccount> {
  return prisma.watchedAccount.create({ data: { address } });
}

export async function createAccountState(
  prisma: DB,
  address: string,
  balance: bigint,
  round: bigint
): Promise<AccountState> {
  const now = new Date();
  return prisma.accountState.create({
    data: {
      address,
      balanceMicro: balance,
      lastCheckedAt: now,
      lastRound: round
    }
  });
}

export function listActiveWithState(prisma: DB) {
  return prisma.watchedAccount.findMany({
    where: { isActive: true },
    include: { state: true },
    orderBy: { createdAt: 'desc' },
  });
}
