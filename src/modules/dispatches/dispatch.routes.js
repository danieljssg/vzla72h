import { cachePreHandler } from '../../plugins/cache.js';
import {
  createDispatch,
  getDispatchByPlateOrCode,
  getPublicDispatches,
  nearDispatches,
} from './dispatch.controller.js';

const PUBLIC_CACHE_TTL = 300;
const readCache = cachePreHandler(PUBLIC_CACHE_TTL);

export default async function dispatchRoutes(app) {
  app.post('/', createDispatch);
  app.get('/', { preHandler: readCache }, getPublicDispatches);
  app.get('/lookup', { preHandler: readCache }, getDispatchByPlateOrCode);
  app.get('/near', nearDispatches);
}
