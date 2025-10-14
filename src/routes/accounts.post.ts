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
        body: AddAccountSchema,
        response: {
          200: AddAccountResponse.describe("Account already being watched"),
          201: AddAccountResponse.describe(
            "Account successfully added to watch list",
          ),
          400: ErrorResponse.describe("Invalid request body"),
          422: ErrorResponse.describe("Invalid Algorand address"),
        },
      },
    },
    async (req, reply) => {
      // Add account
      const { address } = req.body;
      const res = await addWatchedAccount(app.prisma, address);

      // Handle result
      if (!res.ok)
        return reply
          .code(422)
          .send({ code: res.code, message: "Invalid Algorand address" });
      return reply
        .code(res.created ? 201 : 200)
        .send({ address: res.address, created: res.created });
    },
  );
}
