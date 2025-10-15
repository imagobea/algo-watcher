import type { FastifyInstance } from "fastify";
import { AddAccountSchema } from "../utils/schemas.js";
import { addWatchedAccount } from "../services/accounts.js";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { AddAccountResponse, ErrorResponse } from "../utils/serializers.js";

export default async function routes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.post(
    "/accounts",
    {
      schema: {
        tags: ["accounts"],
        summary: "Add an Algorand account to watch",
        description:
          "Adds an Algorand account to the watch list. If the account is valid and not already being watched, it will be added to the database. It will also attempt to fetch the current account state from the Algorand node, but this is non-fatal if it fails since the poller will continue to check the account state and update it accordingly.",
        body: AddAccountSchema,
        response: {
          200: AddAccountResponse.describe("Account already being watched"),
          201: AddAccountResponse.describe("Account added to watch list"),
          400: ErrorResponse.describe("Invalid request body"),
          422: ErrorResponse.describe("Invalid Algorand address"),
          503: ErrorResponse.describe("Database write failed"),
        },
      },
    },
    async (req, reply) => {
      // Add account
      const { address } = req.body;
      const result = await addWatchedAccount(app.prisma, app.log, address);

      // Return response
      return reply
        .code(result.created ? 201 : 200)
        .send({ address: result.address, created: result.created });
    },
  );
}
