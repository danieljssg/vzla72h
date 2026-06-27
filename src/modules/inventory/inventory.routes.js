import { cachePreHandler } from '../../plugins/cache.js';
import {
  adjustStockSchema,
  createInventorySchema,
  updateInventorySchema,
} from '../../utils/validations/schemas/inventorySchema.js';
import {
  adjustStock,
  createInventory,
  deleteInventory,
  getInventoryById,
  getInventoryBySupplyCenter,
  listInventories,
  updateInventory,
} from './inventory.controller.js';

const PUBLIC_CACHE_TTL = 300;
const readCache = cachePreHandler(PUBLIC_CACHE_TTL);

export default async function inventoryRoutes(app) {
  app.get('/', { preHandler: readCache }, listInventories);
  app.get('/by-center/:supplyCenterId', getInventoryBySupplyCenter);
  app.get('/:id', getInventoryById);
  app.post('/', { preHandler: app.validateBody(createInventorySchema) }, createInventory);
  app.put('/:id', { preHandler: app.validateBody(updateInventorySchema) }, updateInventory);
  app.patch('/:id/adjust', { preHandler: app.validateBody(adjustStockSchema) }, adjustStock);
  app.delete('/:id', deleteInventory);
}
