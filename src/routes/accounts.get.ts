import type { FastifyInstance } from 'fastify';
import { listWatchedAccounts } from '../services/accounts.js';

export default async function routes(app: FastifyInstance) {
  app.get('/accounts', async (_req, reply) => {
    const items = await listWatchedAccounts(app.prisma);
    return reply.code(200).send(items);
  });
}