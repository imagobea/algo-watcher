import type {
  AccountState,
  Prisma,
  PrismaClient,
  WatchedAccount,
} from "@prisma/client";

type DB = PrismaClient | Prisma.TransactionClient;

export async function findByAddress(prisma: DB, address: string) {
  return prisma.watchedAccount.findUnique({ where: { address } });
}

export async function createWatchedAccount(
  prisma: DB,
  address: string,
): Promise<WatchedAccount> {
  return prisma.watchedAccount.create({ data: { address } });
}

export async function createAccountState(
  prisma: DB,
  address: string,
  balance: bigint,
  round: bigint,
): Promise<AccountState> {
  const now = new Date();
  return prisma.accountState.create({
    data: {
      address,
      balanceMicro: balance,
      lastCheckedAt: now,
      lastRound: round,
    },
  });
}

export async function updateAccountStateCheckOk(
  prisma: DB,
  address: string,
  balance: bigint,
  round: bigint,
): Promise<AccountState | null> {
  const existing = await prisma.accountState.findUnique({ where: { address } });
  const now = new Date();
  if (existing) {
    return prisma.accountState.update({
      where: { address },
      data: {
        balanceMicro: balance,
        lastCheckedAt: now,
        lastRound: round,
        errorCount: 0,
        lastError: null,
        lastErrorAt: null,
      },
    });
  }
  return createAccountState(prisma, address, balance, round);
}

export async function updateAccountStateCheckKo(
  prisma: DB,
  address: string,
  errorMessage?: string,
): Promise<AccountState | null> {
  const existing = await prisma.accountState.findUnique({ where: { address } });
  const now = new Date();
  if (existing) {
    return prisma.accountState.update({
      where: { address },
      data: {
        lastCheckedAt: now,
        errorCount: existing.errorCount + 1,
        lastError: errorMessage ?? "unknown error",
        lastErrorAt: now,
      },
    });
  }
  return null;
}

export function listActiveWithState(prisma: DB) {
  return prisma.watchedAccount.findMany({
    where: { isActive: true },
    include: { state: true },
    orderBy: { createdAt: "desc" },
  });
}
