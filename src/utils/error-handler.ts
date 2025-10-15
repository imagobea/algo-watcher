import type { FastifyError, FastifyRequest, FastifyReply } from "fastify";

export function errorHandler(
  error: FastifyError,
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  // Log the error (uses Fastify's logger from reply.log)
  reply.log.error(error);

  reply.code(error.statusCode ?? 500).send({
    code: error.code ?? "INTERNAL_SERVER_ERROR",
    message: error.message ?? "Internal Server Error",
  });
}
