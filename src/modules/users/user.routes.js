import { Router } from 'express';
import {
  validateRegister,
  validateUpdateUser,
} from '../../api/middlewares/validationMiddleware.js';
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

const router = Router();

router.get('/', getAllUsers);

// CRUD de usuarios
router.get('/:tagId', getProfile);
router.post('/', validateRegister, create);
router.put('/:tagId', validateUpdateUser, updateSettings);
router.delete('/:tagId', remove);

// Jerarquía
router.get('/:tagId/team', getMyTeam);
router.get('/:tagId/hierarchy', getHierarchy);
router.patch('/:tagId/move', moveUser);

// Batch operations
router.post('/batch/create', createBatch);

export default router;
