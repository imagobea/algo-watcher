import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  AccountState,
  PrismaClient,
  WatchedAccount,
} from "@prisma/client";
import { addWatchedAccount } from "../src/services/accounts.js";

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
import { fetchAccount, type AccountSnapshot } from "../src/clients/algonode.js";
const mockedFetchAccount = vi.mocked(fetchAccount);

describe("addWatchedAccount", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should return error for invalid address", async () => {
    const prisma = {} as PrismaClient;
    const res = await addWatchedAccount(prisma, "invalid_address");

    expect(res).toEqual({ ok: false, code: "invalid_address" });
    expect(mockedFindByAddress).not.toHaveBeenCalled();
    expect(mockedFetchAccount).not.toHaveBeenCalled();
    expect(mockedCreateWatchedAccount).not.toHaveBeenCalled();
    expect(mockedCreateAccountState).not.toHaveBeenCalled();
  });

  it("should return existing account if already watched", async () => {
    const prisma = {} as PrismaClient;
    const address =
      "NSKZ6G52YV7JO2XRVPA3E6UFH72JKE77HX24FZQUDN7WDZ7BUQK53BPTMI";

    mockedFindByAddress.mockResolvedValue({
      address,
      createdAt: new Date(),
      unwatchedAt: null,
      isActive: true,
    } as WatchedAccount);

    const res = await addWatchedAccount(prisma, address);

    expect(res).toEqual({ ok: true, created: false, address });
    expect(mockedFindByAddress).toHaveBeenCalledWith(prisma, address);
    expect(mockedFetchAccount).not.toHaveBeenCalled();
    expect(mockedCreateWatchedAccount).not.toHaveBeenCalled();
    expect(mockedCreateAccountState).not.toHaveBeenCalled();
  });

  it("should add new account with fetched state", async () => {
    const prisma = {
      $transaction: vi.fn((callback) => callback(prisma)),
    } as unknown as PrismaClient;
    const address =
      "NSKZ6G52YV7JO2XRVPA3E6UFH72JKE77HX24FZQUDN7WDZ7BUQK53BPTMI";
    const accountSnapshot = {
      amount: 1000n,
      round: 123456n,
    } as AccountSnapshot;

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

    const res = await addWatchedAccount(prisma, address);

    expect(res).toEqual({ ok: true, created: true, address });
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
    const prisma = {} as PrismaClient;
    const address =
      "NSKZ6G52YV7JO2XRVPA3E6UFH72JKE77HX24FZQUDN7WDZ7BUQK53BPTMI";

    mockedFindByAddress.mockResolvedValue(null);
    mockedFetchAccount.mockRejectedValue(new Error("Random error"));
    mockedCreateWatchedAccount.mockResolvedValue({
      address,
      createdAt: new Date(),
      unwatchedAt: null,
      isActive: true,
    } as WatchedAccount);

    const res = await addWatchedAccount(prisma, address);

    expect(res).toEqual({ ok: true, created: true, address });
    expect(mockedFindByAddress).toHaveBeenCalledWith(prisma, address);
    expect(mockedFetchAccount).toHaveBeenCalledWith(address);
    expect(mockedCreateWatchedAccount).toHaveBeenCalledWith(prisma, address);
    expect(mockedCreateAccountState).not.toHaveBeenCalled();
  });
});
