// Global error handler for Fastify.
// Maps known Mongoose errors and Zod errors to clean HTTP responses.
const handler = (error, request, reply) => {
  // Always log the full error so it's visible in pino-pretty (with stack + message).
  request.log.error({ err: error }, `[${request.method} ${request.url}] Unhandled error`);

  // Mongoose validation
  if (error.name === 'ValidationError' && error.errors) {
    return reply.code(400).send({
      success: false,
      error: 'Validation failed',
      details: error.errors,
    });
  }

  // Mongoose bad ObjectId
  if (error.name === 'CastError') {
    return reply.code(400).send({
      success: false,
      error: 'Invalid ObjectId',
    });
  }

  // Mongoose duplicate key
  if (error.code === 11000) {
    return reply.code(409).send({
      success: false,
      error: error.message || 'Duplicate key',
    });
  }

  // Zod
  if (error.name === 'ZodError' && error.issues) {
    return reply.code(400).send({
      success: false,
      error: 'Validation failed',
      details: error.issues.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
      })),
    });
  }

  // Multipart / payload errors
  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    return reply.code(error.statusCode).send({
      success: false,
      error: error.message,
    });
  }

  // Default: log and return 500
  if (error.statusCode >= 500 || !error.statusCode) {
    return reply.code(500).send({
      success: false,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal Server Error',
    });
  }

  return reply.code(error.statusCode).send({
    success: false,
    error: error.message,
  });
};

const errorHandlerPlugin = async (app) => {
  // The handler is set in buildServer via app.setErrorHandler.
  // This plugin exposes the handler for convenience.
  app.decorate('errorHandler', handler);
};

export { errorHandlerPlugin, handler };
export default { handler, errorHandlerPlugin };
