import { createUserSchema, updateUserSchema } from '../../utils/validations/schemas/userSchema.js';
import {
  create,
  createBatch,
  getAllUsers,
  getHierarchy,
  getMyTeam,
  getProfile,
  moveUser,
  remove,
  updateSettings,
} from './user.controller.js';

export default async function userRoutes(app) {
  app.get('/', getAllUsers);

  // CRUD de usuarios
  app.get('/:tagId', getProfile);
  app.post('/', { preHandler: app.validateBody(createUserSchema) }, create);
  app.put('/:tagId', { preHandler: app.validateBody(updateUserSchema) }, updateSettings);
  app.delete('/:tagId', remove);

  // Jerarquía
  app.get('/:tagId/team', getMyTeam);
  app.get('/:tagId/hierarchy', getHierarchy);
  app.patch('/:tagId/move', moveUser);

  // Batch operations
  app.post('/batch/create', createBatch);
}
