import { cachePreHandler } from '../../plugins/cache.js';
import {
  createSupplyCenterSchema,
  updateSupplyCenterSchema,
} from '../../utils/validations/schemas/supplyCenterSchema.js';
import {
  createSupplyCenter,
  deleteSupplyCenter,
  getSupplyCenterById,
  listSupplyCenters,
  updateSupplyCenter,
} from './supply-center.controller.js';

const PUBLIC_CACHE_TTL = 300;
const readCache = cachePreHandler(PUBLIC_CACHE_TTL);

export default async function supplyCenterRoutes(app) {
  app.get('/', { preHandler: readCache }, listSupplyCenters);
  app.get('/:id', getSupplyCenterById);
  app.post('/', { preHandler: app.validateBody(createSupplyCenterSchema) }, createSupplyCenter);
  app.put('/:id', { preHandler: app.validateBody(updateSupplyCenterSchema) }, updateSupplyCenter);
  app.delete('/:id', deleteSupplyCenter);
}
