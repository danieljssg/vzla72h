import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Worker } from 'bullmq';
import logger from '../../config/logger.js';
import { createBullMQConnection } from '../../config/redis.js';
import User from '../../shared/models/User.js';

const STORAGE_ROOT = '/app/storage/carriers';

const workerConnection = createBullMQConnection('worker:mainStream');

const mainWorker = new Worker(
  'mainStream',
  async (job) => {
    const { name, data } = job;

    logger.info(`[JOB] Procesando tarea: ${name} (ID: ${job.id})`);

    switch (name) {
      case 'SAVE_AUDIT_LOG': {
        logger.info(`📝 Guardando audit log para: ${data.modelName} (${data.action})`);
        const AuditLog = (await import('../../shared/models/AuditLog.js')).default;
        await AuditLog.create(data);
        break;
      }

      case 'UPDATE_OAUTH_DATA': {
        try {
          const { userId, newProfilePicture } = data;
          logger.info(`🖼️ Actualizando foto de perfil para el usuario ID: ${userId}`);

          await User.findByIdAndUpdate(userId, {
            $set: { profilePicture: newProfilePicture },
          });

          logger.info(`✅ Foto de perfil actualizada correctamente para el usuario ${userId}`);
        } catch (error) {
          logger.error(`❌ Error en UPDATE_OAUTH_DATA: ${error.message}`);
        }
        break;
      }

      case 'USER_PURGE': {
        try {
          const { userId } = data;
          const Job = (await import('../../shared/models/Job.js')).default;
          const Analysis = (await import('../../shared/models/Analysis.js')).default;

          logger.info(`🧹 Purgando datos para el usuario ID: ${userId}`);

          const [jobsResult, analysesResult] = await Promise.all([
            Job.deleteMany({ userId }),
            Analysis.deleteMany({ createdBy: userId }),
          ]);

          logger.info(
            `✅ Purge completado para ${userId}: ${jobsResult.deletedCount} jobs, ${analysesResult.deletedCount} análisis`,
          );
        } catch (error) {
          logger.error(`❌ Error en USER_PURGE: ${error.message}`);
        }
        break;
      }

      case 'PROCESS_CARRIER_PHOTO': {
        try {
          const { dispatchId, licensePlate, emptyPhotoBase64 } = data || {};

          if (!dispatchId || !licensePlate || typeof emptyPhotoBase64 !== 'string') {
            throw new Error(
              'PROCESS_CARRIER_PHOTO requires { dispatchId, licensePlate, emptyPhotoBase64 }',
            );
          }

          const safePlate = String(licensePlate)
            .toUpperCase()
            .replace(/[^A-Z0-9-]/g, '');
          const targetDir = join(STORAGE_ROOT, safePlate);
          mkdirSync(targetDir, { recursive: true });

          const fileName = `${randomUUID()}.webp`;
          const absolutePath = join(targetDir, fileName);

          const buffer = Buffer.from(emptyPhotoBase64, 'base64');
          if (buffer.length === 0) {
            throw new Error('Decoded Base64 buffer is empty');
          }
          writeFileSync(absolutePath, buffer);

          const Dispatch = (await import('../../shared/models/Dispatch.js')).default;
          await Dispatch.findByIdAndUpdate(dispatchId, {
            $set: { emptyPhotoUrl: `/uploads/${safePlate}/${fileName}` },
          });

          logger.info(
            `📸 [PROCESS_CARRIER_PHOTO] dispatch=${dispatchId} plate=${safePlate} file=${fileName} (${buffer.length} bytes)`,
          );

          return { success: true, dispatchId, emptyPhotoUrl: `/uploads/${safePlate}/${fileName}` };
        } catch (error) {
          logger.error(`❌ [PROCESS_CARRIER_PHOTO] error: ${error.message}`);
          throw error;
        }
      }

      default:
        logger.warn(`⚠️ Tipo de tarea no reconocida: ${name}`);
    }
  },
  {
    connection: workerConnection,
    concurrency: 5,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
);

mainWorker.on('completed', (job) => {
  logger.info(`✅ Tarea ${job.id} finalizada.`);
});

mainWorker.on('failed', (job, err) => {
  logger.error(`❌ Tarea ${job.id} falló: ${err.message}`);
});

mainWorker.on('error', (err) => {
  logger.error(`[mainWorker] Error interno: ${err.message}`);
});

export default mainWorker;
