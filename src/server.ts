import Fastify, { type FastifyInstance } from "fastify";
import accountsPost from "./routes/accounts.post.js";
import accountsGet from "./routes/accounts.get.js";
import prismaPlugin from "./plugins/prisma.js";
import pollerPlugin from "./plugins/poller.js";
import swaggerPlugin from "./plugins/swagger.js";
import "dotenv/config";
import { errorHandler } from "./utils/error-handler.js";

// Configuration
interface ServerConfig {
  port: number;
  logLevel: "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";
}

const config: ServerConfig = {
  port: Number(process.env.PORT ?? 8080),
  logLevel: (process.env.LOG_LEVEL ?? "info") as ServerConfig["logLevel"],
};

// Server instance
const app: FastifyInstance = Fastify({
  logger: {
    level: config.logLevel,
    transport: { target: "pino-pretty", options: { colorize: true } },
  },
});

// Error handler
app.setErrorHandler(errorHandler);

// Plugin registration
const registerPlugins = async () => {
  await app.register(swaggerPlugin);
  await app.register(prismaPlugin);
  await app.register(pollerPlugin);
};

const registerRoutes = async () => {
  // API routes
  app.register(accountsPost);
  app.register(accountsGet);

  // Root route
  app.get("/", async () => ({
    name: "Algo Watcher",
    version: "1.0.0",
    description: "Watch Algorand accounts and notify on balance changes",
    docs: "/docs",
    health: { liveliness: "/health/liveness", readiness: "/health/readiness" },
  }));

  // Health checks
  app.get("/health/liveness", async () => ({ ok: true }));
  app.get("/health/readiness", async (_req, reply) => {
    try {
      await app.prisma.$connect();
      await app.prisma.$queryRaw`SELECT 1`;
      return reply.code(200).send({ db: "ok" });
    } catch (err) {
      app.log.error(err);
      return reply.code(503).send({ db: "ko" });
    }
  });
};

// Server startup
const start = async () => {
  try {
    await registerPlugins();
    await registerRoutes();
    await app.listen({ host: "0.0.0.0", port: config.port });
    app.log.info(`listening on :${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
