import type { PrismaClient, WatchedAccount } from '@prisma/client';

export async function findByAddress(prisma: PrismaClient, address: string) {
  return prisma.watchedAccount.findUnique({ where: { address } });
}

export async function createWatchedAccount(
  prisma: PrismaClient,
  address: string
): Promise<WatchedAccount> {
  return prisma.watchedAccount.create({ data: { address } });
}

export function listActiveWithState(prisma: PrismaClient) {
  return prisma.watchedAccount.findMany({
    where: { isActive: true },
    include: { state: true },
    orderBy: { createdAt: 'desc' },
  });
}
