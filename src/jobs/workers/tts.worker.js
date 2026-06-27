import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Worker } from 'bullmq';
import { randomUUID } from 'node:crypto';
import logger from '../../config/logger.js';
import { createBullMQConnection } from '../../config/redis.js';
import Analysis from '../../shared/models/Analysis.js';
import AnalysisAudio from '../../shared/models/AnalysisAudio.js';
import { generateSpeech } from '../../shared/services/tts.service.js';

const UPLOAD_DIR = '/app/public/uploads';

if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

const workerConnection = createBullMQConnection('worker:audioStream');

export const ttsWorker = new Worker(
  'audioStream',
  async (job) => {
    const { analysisId } = job.data;

    try {
      logger.info(`[ttsWorker] Iniciando TTS para análisis ${analysisId}`);

      const analysis = await Analysis.findById(analysisId).lean();

      if (!analysis) {
        throw new Error(`Analysis ${analysisId} no encontrado en MongoDB`);
      }

      if (!analysis.ai_insight || analysis.ai_insight === 'N/A') {
        throw new Error(`Analysis ${analysisId} no tiene ai_insight generado`);
      }

      const audioBuffer = await generateSpeech(analysis.ai_insight);

      const fileName = `${randomUUID()}.mp3`;
      const filePath = join(UPLOAD_DIR, fileName);

      writeFileSync(filePath, audioBuffer);

      const audioRecord = await AnalysisAudio.create({
        analysisId: analysis._id,
        fileName,
        filePath,
      });

      logger.info(
        `[ttsWorker] Audio generado: ${fileName} (${audioBuffer.length} bytes) — record ${audioRecord._id}`,
      );

      return { success: true, analysisId, audioId: audioRecord._id, fileName };
    } catch (err) {
      logger.error(`[ttsWorker] Error en TTS para análisis ${analysisId}: ${err.message}`);
      throw err;
    }
  },
  {
    connection: workerConnection,
    concurrency: 1,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
);

ttsWorker.on('completed', (job) => {
  logger.info(`[ttsWorker] Job ${job.id} completado`);
});

ttsWorker.on('failed', (job, err) => {
  logger.error(`[ttsWorker] Job ${job?.id} falló: ${err.message}`);
});

ttsWorker.on('error', (err) => {
  logger.error(`[ttsWorker] Error interno: ${err.message}`);
});
