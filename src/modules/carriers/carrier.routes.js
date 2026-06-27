import { Router } from 'express';
import { cacheMiddleware } from '../../api/middlewares/cache.js';
import {
  carrierStatusSchema,
  createCarrierSchema,
  updateCarrierSchema,
} from '../../utils/validations/schemas/carrierSchema.js';
import zodValidate from '../../utils/validations/zodValidator.js';
import {
  createCarrier,
  deleteCarrier,
  getCarrierById,
  listCarriers,
  updateCarrier,
  updateCarrierStatus,
} from './carrier.controller.js';

const router = Router();

router.get('/', [cacheMiddleware(300)], listCarriers);
router.get('/:id', getCarrierById);
router.post('/', zodValidate(createCarrierSchema), createCarrier);
router.put('/:id', zodValidate(updateCarrierSchema), updateCarrier);
router.patch('/:id/status', zodValidate(carrierStatusSchema), updateCarrierStatus);
router.delete('/:id', deleteCarrier);

export default router;
