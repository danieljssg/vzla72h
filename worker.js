import 'dotenv/config';
import connectDb from './src/config/db.js';
import logger from './src/config/logger.js';

async function startWorker() {
  try {
    await connectDb();

    const { default: mainWorker } = await import('./src/jobs/workers/main.worker.js');

    logger.info('⚙️  Worker de BullMQ iniciado y escuchando tareas...');

    const gracefulShutdown = async (signal) => {
      logger.info(`Recibida señal ${signal}. Cerrando Worker de forma segura...`);

      try {
        await mainWorker.close();
        logger.info('✅ Worker cerrado correctamente.');
      } catch (err) {
        logger.error('❌ Error al cerrar el worker:', err);
      }

      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('❌ Error al iniciar el Worker:', error);
    process.exit(1);
  }
}

startWorker();
