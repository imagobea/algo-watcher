import Fastify from "fastify";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import accountsPost from "../src/routes/accounts.post.js";
import type { PrismaClient } from "@prisma/client";

// Mock addWatchedAccount service
vi.mock("../src/services/accounts.js", () => {
  return {
    addWatchedAccount: vi.fn(),
  };
});
import {
  addWatchedAccount,
  type AddAccountResponse,
} from "../src/services/accounts.js";
const mockedAdd = vi.mocked(addWatchedAccount);

// Helper to build Fastify app with the route and a mocked Prisma client
async function buildApp() {
  const app = Fastify();
  app.decorate("prisma", {} as unknown as PrismaClient);
  app.register(accountsPost);
  await app.ready();
  return app;
}

describe("POST /accounts", () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    vi.resetAllMocks();
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it("should add a new account successfully", async () => {
    const address = "SOME58CHARACTERLONGADDRESS1234567890ABCDE";

    mockedAdd.mockResolvedValue({
      ok: true,
      created: true,
      address,
    } satisfies AddAccountResponse);

    const res = await app.inject({
      method: "POST",
      url: "/accounts",
      payload: { address },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ address, created: true });
    expect(addWatchedAccount).toHaveBeenCalledWith(app.prisma, address);
  });

  it("should return 200 if account already exists", async () => {
    const address = "SOME58CHARACTERLONGADDRESS1234567890ABCDE";

    mockedAdd.mockResolvedValue({
      ok: true,
      created: false,
      address,
    } satisfies AddAccountResponse);

    const res = await app.inject({
      method: "POST",
      url: "/accounts",
      payload: { address },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ address, created: false });
    expect(addWatchedAccount).toHaveBeenCalledWith(app.prisma, address);
  });

  it("should return 400 for invalid request body", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/accounts",
      payload: { invalidField: "value" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: "invalid_body" });
    expect(addWatchedAccount).not.toHaveBeenCalled();
  });

  it("should return 422 for invalid Algorand address", async () => {
    const address = "INVALID_ADDRESS";

    mockedAdd.mockResolvedValue({
      ok: false,
      code: "invalid_address",
    } satisfies AddAccountResponse);

    const res = await app.inject({
      method: "POST",
      url: "/accounts",
      payload: { address },
    });

    expect(res.statusCode).toBe(422);
    expect(res.json()).toMatchObject({ code: "invalid_address" });
    expect(addWatchedAccount).toHaveBeenCalledWith(app.prisma, address);
  });
});
