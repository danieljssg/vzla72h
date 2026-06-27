import { Router } from 'express';
import { cacheMiddleware } from '../../api/middlewares/cache.js';
import {
  createSupplyCenterSchema,
  updateSupplyCenterSchema,
} from '../../utils/validations/schemas/supplyCenterSchema.js';
import zodValidate from '../../utils/validations/zodValidator.js';
import {
  createSupplyCenter,
  deleteSupplyCenter,
  getSupplyCenterById,
  listSupplyCenters,
  updateSupplyCenter,
} from './supply-center.controller.js';

const router = Router();

router.get('/', [cacheMiddleware(300)], listSupplyCenters);
router.get('/:id', getSupplyCenterById);
router.post('/', zodValidate(createSupplyCenterSchema), createSupplyCenter);
router.put('/:id', zodValidate(updateSupplyCenterSchema), updateSupplyCenter);
router.delete('/:id', deleteSupplyCenter);

export default router;
