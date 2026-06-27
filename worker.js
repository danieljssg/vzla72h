import 'dotenv/config';
import connectDb from './src/config/db.js';
import logger from './src/config/logger.js';

async function startWorker() {
  try {
    // 1. Primero conectar a la BD
    await connectDb();

    // 2. Solo después de que la BD está lista, importamos/instanciamos los workers.

    const { default: mainWorker } = await import('./src/jobs/workers/main.worker.js');
    const { analysisWorker } = await import('./src/jobs/workers/analysis.worker.js');
    const { ttsWorker } = await import('./src/jobs/workers/tts.worker.js');

    logger.info('⚙️  Worker de BullMQ iniciado y escuchando tareas...');

    const gracefulShutdown = async (signal) => {
      logger.info(`Recibida señal ${signal}. Cerrando Worker de forma segura...`);

      try {
        // Cierra los workers (espera a que terminen los trabajos en curso)
        await Promise.all([mainWorker.close(), analysisWorker.close(), ttsWorker.close()]);
        logger.info('✅ Workers cerrados correctamente.');
      } catch (err) {
        logger.error('❌ Error al cerrar los workers:', err);
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
