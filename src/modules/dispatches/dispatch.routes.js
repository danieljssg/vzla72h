import { Router } from 'express';
import { cacheMiddleware } from '../../api/middlewares/cache.js';
import {
  createDispatch,
  getDispatchByPlateOrCode,
  getPublicDispatches,
} from './dispatch.controller.js';

const router = Router();

router.post('/', createDispatch);
router.get('/', [cacheMiddleware(300)], getPublicDispatches);
router.get('/lookup', [cacheMiddleware(300)], getDispatchByPlateOrCode);

export default router;
