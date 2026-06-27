import logger from '../../config/logger.js';
import { CacheConnection } from '../../config/redis.js';

export const cacheMiddleware = (duration = 3600) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.split(' ')[1];
    const csrfToken = req.headers['x-csrf-token'];
    const identifier = req.user?.id || bearerToken || csrfToken || 'global';

    const key = `cache:${identifier}:${req.originalUrl}`;
    const refresh = req.headers['x-refresh'] === 'true' || req.query.refresh === 'true';

    try {
      if (!refresh) {
        const cachedResponse = await CacheConnection.get(key);
        if (cachedResponse) {
          logger.info(`Response from cache for [${identifier}] for ${duration} seconds`);
          return res.json(JSON.parse(cachedResponse));
        }
      }

      const originalJson = res.json;
      res.json = (body) => {
        res.json = originalJson;
        if (res.statusCode === 200) {
          CacheConnection.setex(key, duration, JSON.stringify(body));
        }

        return res.json(body);
      };
      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

export const clearCache = async (identifier) => {
  if (!identifier) return;
  try {
    let cursor = '0';
    let clearedCount = 0;

    do {
      const [newCursor, keys] = await CacheConnection.scan(
        cursor,
        'MATCH',
        `cache:${identifier}:*`,
        'COUNT',
        100,
      );
      cursor = newCursor;

      if (keys.length > 0) {
        await CacheConnection.del(...keys);
        clearedCount += keys.length;
      }
    } while (cursor !== '0');

    if (clearedCount > 0) {
      logger.info(`Cache cleared for identifier [${identifier}]: ${clearedCount} keys removed`);
    }
  } catch (error) {
    logger.error('Error clearing cache:', error);
  }
};
