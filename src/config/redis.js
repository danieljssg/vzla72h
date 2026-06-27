import IoRedis from 'ioredis';
import logger from './logger.js';

const baseConfig = {
  host: process.env.VALKEY_HOST,
  port: parseInt(process.env.VALKEY_PORT, 10),
  password: process.env.VALKEY_PASSWORD,
};

export function createBullMQConnection(label = 'bullmq') {
  const conn = new IoRedis({
    ...baseConfig,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => {
      const delay = Math.min(times * 500, 5000);
      logger.warn(`[Redis:${label}] Reintentando conexión (intento ${times}, delay ${delay}ms)`);
      return delay;
    },
    lazyConnect: false,
  });

  conn.on('connect', () => {
    logger.info(`[Redis:${label}] ✅ Conectado Correctamente`);
  });

  conn.on('error', (err) => {
    logger.error(`[Redis:${label}] ❌ Error de conexión: ${err.message}`);
  });

  conn.on('close', () => {
    logger.warn(`[Redis:${label}] Conexión cerrada`);
  });

  return conn;
}

export function createServiceConnection(label = 'service') {
  const conn = new IoRedis({
    ...baseConfig,
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    retryStrategy: (times) => {
      const delay = Math.min(times * 500, 5000);
      logger.warn(`[Redis:${label}] Reintentando conexión (intento ${times}, delay ${delay}ms)`);
      return delay;
    },
  });

  conn.on('connect', () => {
    logger.info(`[Redis:${label}] ✅ Conectado`);
  });

  conn.on('error', (err) => {
    logger.error(`[Redis:${label}] ❌ Error: ${err.message}`);
  });

  return conn;
}

// Conexiones de servicio (singleton está OK para estos — un solo consumidor cada uno)
export const CacheConnection = createServiceConnection('cache');
export const SessionConnection = createServiceConnection('session');
