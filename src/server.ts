import Fastify from "fastify";
import accountsPost from "./routes/accounts.post.js";
import accountsGet from "./routes/accounts.get.js";
import prismaPlugin from "./plugins/prisma.js";
import pollerPlugin from "./plugins/poller.js";
import "dotenv/config";

const PORT = Number(process.env.PORT ?? 8080);
const LOG_LEVEL = (process.env.LOG_LEVEL ?? "info") as
  | "fatal"
  | "error"
  | "warn"
  | "info"
  | "debug"
  | "trace"
  | "silent";

const app = Fastify({
  logger: {
    level: LOG_LEVEL,
    transport: { target: "pino-pretty", options: { colorize: true } },
  },
});

// Register db plugin
app.register(prismaPlugin);

// Register routes
app.register(accountsPost);
app.register(accountsGet);

// Register poller plugin
app.register(pollerPlugin);

// Root route
app.get("/", async () => ({
  name: "Algo Watcher",
  version: "1.0.0",
  description: "Watch Algorand accounts and notify on balance changes",
  docs: "/docs", // TODO: Add Swagger docs
  health: { liveliness: "/health/liveness", readiness: "/health/readiness" },
}));

// Server liveliness
app.get("/health/liveness", async () => ({ ok: true }));

// Server readiness
app.get("/health/readiness", async (_req, reply) => {
  try {
    await app.prisma.$connect();
    await app.prisma.$queryRaw`SELECT 1`;
    return reply.code(200).send({ db: "ok" });
  } catch (err) {
    app.log.error(err);
    return reply.code(503).send({ db: "error" });
  }
});

const start = async () => {
  try {
    await app.listen({ host: "0.0.0.0", port: PORT });
    app.log.info(`listening on :${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
