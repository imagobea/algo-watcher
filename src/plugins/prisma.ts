import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export default fp(async (app) => {
    const prisma = new PrismaClient();

    // Connect to the database
    await prisma.$connect();

    // Decorate fastify instance
    app.decorate('prisma', prisma);

    // Disconnect on server close
    app.addHook('onClose', async (app) => { await app.prisma.$disconnect(); });
});
