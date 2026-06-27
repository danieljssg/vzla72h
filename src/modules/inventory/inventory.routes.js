import { Router } from 'express';
import { cacheMiddleware } from '../../api/middlewares/cache.js';
import {
  adjustStockSchema,
  createInventorySchema,
  updateInventorySchema,
} from '../../utils/validations/schemas/inventorySchema.js';
import zodValidate from '../../utils/validations/zodValidator.js';
import {
  adjustStock,
  createInventory,
  deleteInventory,
  getInventoryById,
  getInventoryBySupplyCenter,
  listInventories,
  updateInventory,
} from './inventory.controller.js';

const router = Router();

router.get('/', [cacheMiddleware(300)], listInventories);
router.get('/by-center/:supplyCenterId', getInventoryBySupplyCenter);
router.get('/:id', getInventoryById);
router.post('/', zodValidate(createInventorySchema), createInventory);
router.put('/:id', zodValidate(updateInventorySchema), updateInventory);
router.patch('/:id/adjust', zodValidate(adjustStockSchema), adjustStock);
router.delete('/:id', deleteInventory);

export default router;
