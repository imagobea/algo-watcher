import fp from "fastify-plugin";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUI from "@fastify/swagger-ui";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

export default fp(async (app) => {
  // Enable Zod for validation/serialization
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(fastifySwagger, {
    openapi: {
      info: {
        title: "Algo Watcher API",
        description: "API documentation for the Algo Watcher service",
        version: "1.0.0",
      },
      servers: [], // TODO
    },
    transform: jsonSchemaTransform,
  });

  app.register(fastifySwaggerUI, {
    routePrefix: "/docs",
    // uiConfig: {
    //   docExpansion: "list",
    //   deepLinking: true,
    //   displayRequestDuration: true,
    // },
  });
});
