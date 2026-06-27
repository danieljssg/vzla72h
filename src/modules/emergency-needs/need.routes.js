import { cachePreHandler } from '../../plugins/cache.js';
import {
  createEmergencyNeedSchema,
  updateEmergencyNeedSchema,
} from '../../utils/validations/schemas/emergencyNeedSchema.js';
import {
  createEmergencyNeed,
  deleteEmergencyNeed,
  getActiveNeeds,
  getEmergencyNeedById,
  listEmergencyNeeds,
  nearEmergencyNeeds,
  resolveEmergencyNeed,
  updateEmergencyNeed,
} from './need.controller.js';

const PUBLIC_CACHE_TTL = 300;
const readCache = cachePreHandler(PUBLIC_CACHE_TTL);

export default async function emergencyNeedRoutes(app) {
  app.post('/', { preHandler: app.validateBody(createEmergencyNeedSchema) }, createEmergencyNeed);
  app.get('/', { preHandler: readCache }, listEmergencyNeeds);
  app.get('/near', nearEmergencyNeeds);
  app.get('/public/active', { preHandler: readCache }, getActiveNeeds);
  app.get('/:id', getEmergencyNeedById);
  app.put('/:id', { preHandler: app.validateBody(updateEmergencyNeedSchema) }, updateEmergencyNeed);
  app.patch('/:id/resolve', resolveEmergencyNeed);
  app.delete('/:id', deleteEmergencyNeed);
}
