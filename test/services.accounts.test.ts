import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  Prisma,
  type AccountState,
  type PrismaClient,
  type WatchedAccount,
} from "@prisma/client";
import { addWatchedAccount } from "../src/services/accounts.js";
import type { FastifyBaseLogger } from "fastify";
import {
  DbWriteFailedError,
  InvalidAlgoAddressError,
} from "../src/utils/errors.js";

// Mock the repos functions
vi.mock("../src/repos/accounts.js", () => {
  return {
    findByAddress: vi.fn(),
    createWatchedAccount: vi.fn(),
    createAccountState: vi.fn(),
    listActiveWithState: vi.fn(),
  };
});
import {
  findByAddress,
  createWatchedAccount,
  createAccountState,
} from "../src/repos/accounts.js";
const mockedFindByAddress = vi.mocked(findByAddress);
const mockedCreateWatchedAccount = vi.mocked(createWatchedAccount);
const mockedCreateAccountState = vi.mocked(createAccountState);

// Mock fetchAccount from algonode client
vi.mock("../src/clients/algonode.js", () => {
  return { fetchAccount: vi.fn() };
});
import {
  fetchAccount,
  type FetchSuccess,
  type FetchError,
} from "../src/clients/algonode.js";
const mockedFetchAccount = vi.mocked(fetchAccount);

describe("addWatchedAccount", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should throw error for invalid address", async () => {
    const prisma = {} as PrismaClient;
    const logger = { warn: vi.fn() } as unknown as FastifyBaseLogger;

    await expect(
      addWatchedAccount(prisma, logger, "BAD_ADDRESS"),
    ).rejects.toThrowError(InvalidAlgoAddressError());

    expect(mockedFindByAddress).not.toHaveBeenCalled();
    expect(mockedFetchAccount).not.toHaveBeenCalled();
    expect(mockedCreateWatchedAccount).not.toHaveBeenCalled();
    expect(mockedCreateAccountState).not.toHaveBeenCalled();
  });

  it("should return existing account if already watched", async () => {
    const prisma = {} as PrismaClient;
    const logger = { debug: vi.fn() } as unknown as FastifyBaseLogger;
    const address =
      "NSKZ6G52YV7JO2XRVPA3E6UFH72JKE77HX24FZQUDN7WDZ7BUQK53BPTMI";

    mockedFindByAddress.mockResolvedValue({
      address,
      createdAt: new Date(),
      unwatchedAt: null,
      isActive: true,
    } as WatchedAccount);

    const result = await addWatchedAccount(prisma, logger, address);

    expect(result).toEqual({ ok: true, created: false, address });
    expect(mockedFindByAddress).toHaveBeenCalledWith(prisma, address);
    expect(mockedFetchAccount).not.toHaveBeenCalled();
    expect(mockedCreateWatchedAccount).not.toHaveBeenCalled();
    expect(mockedCreateAccountState).not.toHaveBeenCalled();
  });

  it("should add new account with fetched state", async () => {
    const prisma = {
      $transaction: vi.fn((callback) => callback(prisma)),
    } as unknown as PrismaClient;
    const logger = {
      debug: vi.fn(),
      info: vi.fn(),
    } as unknown as FastifyBaseLogger;
    const address =
      "NSKZ6G52YV7JO2XRVPA3E6UFH72JKE77HX24FZQUDN7WDZ7BUQK53BPTMI";
    const accountSnapshot: FetchSuccess = {
      ok: true,
      amount: 100n,
      round: 456n,
    };

    mockedFindByAddress.mockResolvedValue(null);
    mockedFetchAccount.mockResolvedValue(accountSnapshot);
    mockedCreateWatchedAccount.mockResolvedValue({
      address,
      createdAt: new Date(),
      unwatchedAt: null,
      isActive: true,
    } as WatchedAccount);
    mockedCreateAccountState.mockResolvedValue({
      address,
      balanceMicro: accountSnapshot.amount,
      lastCheckedAt: new Date(),
      lastRound: accountSnapshot.round,
      errorCount: 0,
      lastError: null,
      lastErrorAt: null,
    } as AccountState);

    const result = await addWatchedAccount(prisma, logger, address);

    expect(result).toEqual({ ok: true, created: true, address });
    expect(mockedFindByAddress).toHaveBeenCalledWith(prisma, address);
    expect(mockedFetchAccount).toHaveBeenCalledWith(address);
    expect(mockedCreateWatchedAccount).toHaveBeenCalledWith(prisma, address);
    expect(mockedCreateAccountState).toHaveBeenCalledWith(
      prisma,
      address,
      accountSnapshot.amount,
      accountSnapshot.round,
    );
  });

  it("should add new account without state if fetch fails", async () => {
    const prisma = {
      $transaction: vi.fn((callback) => callback(prisma)),
    } as unknown as PrismaClient;
    const logger = {
      debug: vi.fn(),
      info: vi.fn(),
    } as unknown as FastifyBaseLogger;
    const address =
      "NSKZ6G52YV7JO2XRVPA3E6UFH72JKE77HX24FZQUDN7WDZ7BUQK53BPTMI";
    const accountSnapshot: FetchError = {
      ok: false,
      type: "timeout",
      message: "This is a timeout error",
    };

    mockedFindByAddress.mockResolvedValue(null);
    mockedFetchAccount.mockResolvedValue(accountSnapshot);
    mockedCreateWatchedAccount.mockResolvedValue({
      address,
      createdAt: new Date(),
      unwatchedAt: null,
      isActive: true,
    } as WatchedAccount);

    const result = await addWatchedAccount(prisma, logger, address);

    expect(result).toEqual({ ok: true, created: true, address });
    expect(mockedFindByAddress).toHaveBeenCalledWith(prisma, address);
    expect(mockedFetchAccount).toHaveBeenCalledWith(address);
    expect(mockedCreateWatchedAccount).toHaveBeenCalledWith(prisma, address);
    expect(mockedCreateAccountState).not.toHaveBeenCalled();
  });

  it("should handle a unique constraint violation gracefully", async () => {
    // Prisma throws this when a unique constraint fails (e.g., race condition)
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed on the fields: (`address`)",
      { code: "P2002", clientVersion: "test" },
    );
    // Force $transaction to throw the P2002 error
    const prisma = {
      $transaction: vi.fn(() => {
        throw prismaError;
      }),
    } as unknown as PrismaClient;

    const logger = { error: vi.fn() } as unknown as FastifyBaseLogger;
    const address =
      "NSKZ6G52YV7JO2XRVPA3E6UFH72JKE77HX24FZQUDN7WDZ7BUQK53BPTMI";
    const accountSnapshot: FetchSuccess = {
      ok: true,
      amount: 100n,
      round: 456n,
    };

    mockedFindByAddress.mockResolvedValue(null);
    mockedFetchAccount.mockResolvedValue(accountSnapshot);

    const result = await addWatchedAccount(prisma, logger, address);

    expect(result).toEqual({ ok: true, created: false, address });
    expect(mockedFindByAddress).toHaveBeenCalledWith(prisma, address);
    expect(mockedFetchAccount).toHaveBeenCalledWith(address);
    expect(mockedCreateWatchedAccount).not.toHaveBeenCalled();
    expect(mockedCreateAccountState).not.toHaveBeenCalled();
  });

  it("should throw db write failed error", async () => {
    // Force prisma.$transaction to throw
    const prisma = {
      $transaction: vi.fn(() => {
        throw new Error("DB failure");
      }),
    } as unknown as PrismaClient;
    const logger = { error: vi.fn() } as unknown as FastifyBaseLogger;
    const address =
      "NSKZ6G52YV7JO2XRVPA3E6UFH72JKE77HX24FZQUDN7WDZ7BUQK53BPTMI";
    const accountSnapshot: FetchSuccess = {
      ok: true,
      amount: 100n,
      round: 456n,
    };

    mockedFindByAddress.mockResolvedValue(null);
    mockedFetchAccount.mockResolvedValue(accountSnapshot);

    await expect(
      addWatchedAccount(prisma, logger, address),
    ).rejects.toThrowError(DbWriteFailedError());

    expect(mockedFindByAddress).toHaveBeenCalledWith(prisma, address);
    expect(mockedFetchAccount).toHaveBeenCalledWith(address);
    expect(mockedCreateWatchedAccount).not.toHaveBeenCalled();
    expect(mockedCreateAccountState).not.toHaveBeenCalled();
  });
});
