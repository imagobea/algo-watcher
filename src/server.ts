import Fastify from 'fastify';
import accountsPost from './routes/accounts.post.js';
import accountsGet from './routes/accounts.get.js';
import prismaPlugin from './plugins/prisma.js';
import 'dotenv/config';

const PORT = Number(process.env.PORT ?? 8080);
const LOG_LEVEL = (process.env.LOG_LEVEL ?? 'info') as
  | 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';

const app = Fastify({
  logger: { level: LOG_LEVEL, transport: { target: 'pino-pretty', options: { colorize: true } } },
});

// Register plugins
app.register(prismaPlugin);

// Register routes
app.register(accountsPost);
app.register(accountsGet);

// Simple routes - TODO move to separate files

// root
app.get('/', async (request, reply) => {
    return { hello: 'world' };
});

// health
app.get('/health/liveness', async () => ({ ok: true }));

// quick DB ping route
app.get('/db/ping', async () => {
  const count = await app.prisma.watchedAccount.count();
  return { ok: true, accounts: count };
});

const start = async () => {
    try {
        await app.listen({ host: '0.0.0.0', port: PORT });
        app.log.info(`listening on :${PORT}`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
