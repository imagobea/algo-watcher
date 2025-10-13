import type { PrismaClient } from '@prisma/client';

export async function createBalanceChangeNotification(
  prisma: PrismaClient,
  address: string,
  oldBalance: bigint,
  newBalance: bigint,
  diff: bigint,
  round: bigint
) {
  const now = new Date();
  return prisma.balanceChangeNotification.create({
    data: {
      address,
      oldBalance: oldBalance,
      newBalance: newBalance,
      diff: diff,
      observedAt: now,
      round: round
    }
  });
}
