import type { FastifyInstance } from 'fastify';
import { AddAccountSchema } from '../utils/schemas.js';
import { addWatchedAccount } from '../services/accounts.js';

export default async function routes(app: FastifyInstance) {
  app.post('/accounts', async (req, reply) => {
    // Validate body
    const parsed = AddAccountSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error?.issues?.[0]?.message ?? 'Invalid request body';
      return reply.code(400).send({ code: 'invalid_body', message });
    }

    // Add account
    const { address } = parsed.data;
    const res = await addWatchedAccount(app.prisma, address);

    // Handle result
    if (!res.ok) return reply.code(422).send({ code: res.code, message: 'Invalid Algorand address' });
    return reply.code(res.created ? 201 : 200).send({ address: res.address, created: res.created });
  });
}
