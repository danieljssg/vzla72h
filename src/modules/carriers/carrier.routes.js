import { cachePreHandler } from '../../plugins/cache.js';
import {
  carrierStatusSchema,
  createCarrierSchema,
  updateCarrierSchema,
} from '../../utils/validations/schemas/carrierSchema.js';
import {
  createCarrier,
  deleteCarrier,
  getCarrierById,
  listCarriers,
  updateCarrier,
  updateCarrierStatus,
} from './carrier.controller.js';

const PUBLIC_CACHE_TTL = 300;
const readCache = cachePreHandler(PUBLIC_CACHE_TTL);

export default async function carrierRoutes(app) {
  app.get('/', { preHandler: readCache }, listCarriers);
  app.get('/:id', getCarrierById);
  app.post('/', { preHandler: app.validateBody(createCarrierSchema) }, createCarrier);
  app.put('/:id', { preHandler: app.validateBody(updateCarrierSchema) }, updateCarrier);
  app.patch(
    '/:id/status',
    { preHandler: app.validateBody(carrierStatusSchema) },
    updateCarrierStatus,
  );
  app.delete('/:id', deleteCarrier);
}
