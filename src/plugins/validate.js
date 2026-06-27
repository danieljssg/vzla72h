import { z } from 'zod';
import logger from '../config/logger.js';

// Pre-handler factory: validates request.body against a zod schema.
function validateBody(schema) {
  return async (request, reply) => {
    try {
      const parsed = schema.parse(request.body ?? {});
      request.body = parsed;
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error('Validation error:', error.issues);
        return reply.code(400).send({
          message: 'Error de validación',
          errors: error.issues.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      return reply.send(error);
    }
  };
}

// Pre-handler factory: validates request.params against a zod schema.
function validateParams(schema) {
  return async (request, reply) => {
    try {
      request.params = schema.parse(request.params);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          message: 'Error de validación en parámetros',
          errors: error.issues.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      return reply.send(error);
    }
  };
}

// Pre-handler factory: validates request.query against a zod schema.
function validateQuery(schema) {
  return async (request, reply) => {
    try {
      request.query = schema.parse(request.query);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          message: 'Error de validación en query',
          errors: error.issues.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      return reply.send(error);
    }
  };
}

async function validatePlugin(app) {
  app.decorate('validateBody', validateBody);
  app.decorate('validateParams', validateParams);
  app.decorate('validateQuery', validateQuery);
  // Backwards-compat alias (used in older route code).
  app.decorate('validate', validateBody);
}

export { validateBody, validateParams, validatePlugin, validateQuery };
export default { validateBody, validateParams, validateQuery, validatePlugin };
