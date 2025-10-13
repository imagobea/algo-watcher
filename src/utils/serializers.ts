import type { AccountState, WatchedAccount } from '@prisma/client';

interface SerializedWatchedAccount {
  address: string;
  createdAt: string;
  unwatchedAt: string | null;
  isActive: boolean;
  state: SerializedAccountState | null;
}

interface SerializedAccountState {
  balanceMicro: string;
  lastCheckedAt: string;
  lastRound: string;
  errorCount: number;
  lastError: string | null;
  lastErrorAt: string | null;
}

export function serializeWatchedAccount(account: WatchedAccount & { state: AccountState | null }): SerializedWatchedAccount {
  return {
    address: account.address,
    createdAt: account.createdAt.toISOString(),
    unwatchedAt: account.unwatchedAt?.toISOString() ?? null,
    isActive: account.isActive,
    state: account.state ? serializeAccountState(account.state) : null
  };
}

function serializeAccountState(state: AccountState): SerializedAccountState {
  return {
    balanceMicro: state.balanceMicro.toString(),
    lastCheckedAt: state.lastCheckedAt.toISOString(),
    lastRound: state.lastRound.toString(),
    errorCount: state.errorCount,
    lastError: state.lastError,
    lastErrorAt: state.lastErrorAt?.toISOString() ?? null
  };
}
