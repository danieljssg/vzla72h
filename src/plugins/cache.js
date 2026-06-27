import logger from '../config/logger.js';
import { CacheConnection } from '../config/redis.js';

const getIdentifier = (request) => {
  const authHeader = request.headers.authorization;
  const bearerToken = authHeader?.split(' ')[1];
  return request.user?.id || bearerToken || 'global';
};

const buildCacheKey = (request) => {
  const identifier = getIdentifier(request);
  return `cache:${identifier}:${request.raw.url}`;
};

// Pre-handler: returns cached payload directly if present, skipping the route handler.
function cachePreHandler(ttlSeconds) {
  return async (request, reply) => {
    if (request.method !== 'GET') {
      return;
    }
    if (request.headers['x-refresh'] === 'true' || request.query?.refresh === 'true') {
      return;
    }

    const key = buildCacheKey(request);

    try {
      const cached = await CacheConnection.get(key);
      if (cached) {
        logger.debug(`Response from cache for key=${key} (${ttlSeconds}s)`);
        reply.header('x-cache', 'HIT');
        reply.send(JSON.parse(cached));
      }
    } catch (error) {
      logger.error('Cache preHandler error:', error);
    }
  };
}

// onSend hook factory: caches JSON responses for GETs (skips when x-refresh, ?refresh=true,
// or when the response was already served from cache).
function cacheOnSend(ttlSeconds) {
  return async (request, reply, payload) => {
    // Skip non-GET, non-200, or refresh requests
    if (request.method !== 'GET' || reply.statusCode !== 200) {
      return payload;
    }
    if (request.headers['x-refresh'] === 'true' || request.query?.refresh === 'true') {
      return payload;
    }
    // Skip if the response was served from cache
    if (reply.getHeader('x-cache') === 'HIT') {
      return payload;
    }

    const key = buildCacheKey(request);

    try {
      const stringPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);
      await CacheConnection.setex(key, ttlSeconds, stringPayload);
      logger.debug(`Cache stored key=${key} (${ttlSeconds}s)`);
    } catch (error) {
      logger.error('Cache onSend error:', error);
    }

    return payload;
  };
}

// Clears all cache entries for a given identifier (user id or token).
async function clearCache(identifier) {
  if (!identifier) {
    return 0;
  }
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
    return clearedCount;
  } catch (error) {
    logger.error('Error clearing cache:', error);
    return 0;
  }
}

async function cachePlugin(app) {
  app.decorate('clearCache', clearCache);
}

export { cacheOnSend, cachePlugin, cachePreHandler, clearCache };
export default { cacheOnSend, cachePreHandler, clearCache, cachePlugin };
