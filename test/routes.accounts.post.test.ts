import Fastify from "fastify";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import accountsPost from "../src/routes/accounts.post.js";
import type { PrismaClient } from "@prisma/client";
import {
  validatorCompiler,
  serializerCompiler,
} from "fastify-type-provider-zod";
import { errorHandler } from "../src/utils/error-handler.js";
import {
  DbWriteFailedError,
  InvalidAlgoAddressError,
} from "../src/utils/errors.js";

// Mock addWatchedAccount service
vi.mock("../src/services/accounts.js", () => {
  return {
    addWatchedAccount: vi.fn(),
  };
});
import {
  addWatchedAccount,
  type AddAccountResult,
} from "../src/services/accounts.js";
const mockedAdd = vi.mocked(addWatchedAccount);

// Helper to build minimal Fastify app with the route and a mocked Prisma client
async function buildApp() {
  // Create app with fake logger
  const app = Fastify();

  // Set up zod
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Set up error handler
  app.setErrorHandler(errorHandler);

  // Mock Prisma client
  app.decorate("prisma", {} as unknown as PrismaClient);

  // Register route
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
    } satisfies AddAccountResult);

    const res = await app.inject({
      method: "POST",
      url: "/accounts",
      payload: { address },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ address, created: true });
    expect(addWatchedAccount).toHaveBeenCalledWith(
      app.prisma,
      app.log,
      address,
    );
  });

  it("should return 200 if account already exists", async () => {
    const address = "SOME58CHARACTERLONGADDRESS1234567890ABCDE";

    mockedAdd.mockResolvedValue({
      ok: true,
      created: false,
      address,
    } satisfies AddAccountResult);

    const res = await app.inject({
      method: "POST",
      url: "/accounts",
      payload: { address },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ address, created: false });
    expect(addWatchedAccount).toHaveBeenCalledWith(
      app.prisma,
      app.log,
      address,
    );
  });

  it("should return 400 for invalid request body", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/accounts",
      payload: { invalidField: "value" },
    });

    expect(res.statusCode).toBe(400);
    expect(addWatchedAccount).not.toHaveBeenCalled();
  });

  it("should return 422 for invalid Algorand address", async () => {
    const address = "INVALID_ADDRESS";

    // Mock to throw InvalidAlgoAddressError
    mockedAdd.mockRejectedValue(InvalidAlgoAddressError());

    const res = await app.inject({
      method: "POST",
      url: "/accounts",
      payload: { address },
    });

    expect(res.statusCode).toBe(422);
    expect(res.json()).toMatchObject({
      code: "APP_ERR_INVALID_ALGO_ADDRESS",
    });
    expect(addWatchedAccount).toHaveBeenCalledWith(
      app.prisma,
      app.log,
      address,
    );
  });

  it("should return 503 for database write failure", async () => {
    const address = "SOME58CHARACTERLONGADDRESS1234567890ABCDE";

    // Mock to throw DbWriteFailedError
    mockedAdd.mockRejectedValue(DbWriteFailedError());

    const res = await app.inject({
      method: "POST",
      url: "/accounts",
      payload: { address },
    });

    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({
      code: "APP_ERR_DB_WRITE_FAILED",
    });
    expect(addWatchedAccount).toHaveBeenCalledWith(
      app.prisma,
      app.log,
      address,
    );
  });
});
