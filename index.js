import 'dotenv/config';
import { buildServer } from './src/server.js';
import connectDb from './src/config/db.js';
import logger from './src/config/logger.js';

const PORT = parseInt(process.env.PORT, 10);
const HOST = process.env.HOST || '0.0.0.0';

async function startServer() {
  try {
    await connectDb();
    logger.info('MongoDB connected');

    const app = await buildServer();

    const shutdown = async (signal) => {
      logger.info(`Recibida señal ${signal}. Cerrando servidor...`);
      try {
        await app.close();
        logger.info('Servidor cerrado correctamente.');
      } catch (err) {
        logger.error('Error al cerrar el servidor:', err);
      }
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    await app.listen({ port: PORT, host: HOST });
    logger.info(`Venezuela Route 72 API listening on http://${HOST}:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  } catch (error) {
    logger.error('Fatal error starting the application:');
    logger.error(error);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection at Promise:', reason);
});

startServer();
