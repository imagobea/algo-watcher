import type { FastifyInstance } from 'fastify';
import { listWatchedAccounts } from '../services/accounts.js';
import { serializeWatchedAccount } from '../utils/serializers.js';

export default async function routes(app: FastifyInstance) {
  app.get('/accounts', async (_req, reply) => {
    const items = await listWatchedAccounts(app.prisma);
    const serialized = items.map(serializeWatchedAccount);
    return reply.code(200).send(serialized);
  });
}