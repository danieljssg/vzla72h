import { existsSync } from 'node:fs';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyMultipart from '@fastify/multipart';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifySensible from '@fastify/sensible';
import fastifyStatic from '@fastify/static';
import fastify from 'fastify';
import corsConfig from './config/corsConfig.js';
import logger from './config/logger.js';
import carrierRoutes from './modules/carriers/carrier.routes.js';
import dispatchRoutes from './modules/dispatches/dispatch.routes.js';
import emergencyNeedRoutes from './modules/emergency-needs/need.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import itemRoutes from './modules/items/item.routes.js';
import supplyCenterRoutes from './modules/supply-centers/supply-center.routes.js';
import userRoutes from './modules/users/user.routes.js';
import { cacheOnSend, clearCache } from './plugins/cache.js';
import { handler as errorHandler } from './plugins/errorHandler.js';
import { validateBody, validateParams, validateQuery } from './plugins/validate.js';

const PUBLIC_CACHE_TTL = 300;

export async function buildServer() {
  const app = fastify({
    loggerInstance: logger,
    disableRequestLogging: false,
    trustProxy: true,
    bodyLimit: 10 * 1024 * 1024,
    ajv: {
      customOptions: {
        removeAdditional: 'all',
        coerceTypes: true,
        useDefaults: true,
      },
    },
  });

  // Core plugins
  await app.register(fastifySensible);
  await app.register(fastifyHelmet, {
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  });
  await app.register(fastifyCors, corsConfig);
  await app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '5 minutes',
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    errorResponseBuilder: () => ({
      success: false,
      error: 'Demasiadas peticiones desde esta IP, por favor intenta de nuevo en unos minutos.',
    }),
  });

  // Multipart (for emergency-needs audio upload)
  await app.register(fastifyMultipart, {
    limits: { fileSize: 3 * 1024 * 1024 },
  });

  // Static files — only register if directories exist (avoids warnings in local dev)
  if (existsSync('/app/storage/carriers')) {
    await app.register(fastifyStatic, {
      root: '/app/storage/carriers',
      prefix: '/uploads/',
      decorateReply: false,
    });
  }
  if (existsSync('/app/storage/requests')) {
    await app.register(fastifyStatic, {
      root: '/app/storage/requests',
      prefix: '/uploads/requests/',
      decorateReply: false,
    });
  }

  // App-level decorators
  app.decorate('clearCache', clearCache);
  app.decorate('validateBody', validateBody);
  app.decorate('validateParams', validateParams);
  app.decorate('validateQuery', validateQuery);
  app.decorate('validate', validateBody); // back-compat alias

  // Global error handler
  app.setErrorHandler(errorHandler);

  // Health check
  app.get('/health', async () => ({
    status: 'ok',
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || '1.0.0',
  }));

  // Cache onSend hook
  app.addHook('onSend', cacheOnSend(PUBLIC_CACHE_TTL));

  // API v1 root
  app.get('/api', async () => ({
    name: 'Venezuela Route 72 API',
    version: process.env.API_VERSION || '1.0.0',
    status: 'running',
  }));

  // API routes — public, no authentication
  await app.register(userRoutes, { prefix: '/api/users' });
  await app.register(carrierRoutes, { prefix: '/api/carriers' });
  await app.register(dispatchRoutes, { prefix: '/api/dispatches' });
  await app.register(emergencyNeedRoutes, { prefix: '/api/emergency-needs' });
  await app.register(inventoryRoutes, { prefix: '/api/inventory' });
  await app.register(itemRoutes, { prefix: '/api/items' });
  await app.register(supplyCenterRoutes, { prefix: '/api/supply-centers' });

  // 404 handler
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      error: 'Not Found',
      message: `Route ${request.raw.url} not found`,
    });
  });

  return app;
}
