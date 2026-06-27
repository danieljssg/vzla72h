import { Router } from 'express';
import carrierRoutes from '../../modules/carriers/carrier.routes.js';
import dispatchesRoutes from '../../modules/dispatches/dispatch.routes.js';
import emergencyNeedsRoutes from '../../modules/emergency-needs/need.routes.js';
import inventoryRoutes from '../../modules/inventory/inventory.routes.js';
import itemRoutes from '../../modules/items/item.routes.js';
import supplyCenterRoutes from '../../modules/supply-centers/supply-center.routes.js';
import { cacheMiddleware } from '../middlewares/cache.js';

const router = Router();

const PUBLIC_CACHE_TTL = 300;

router.use('/items', [cacheMiddleware(PUBLIC_CACHE_TTL)], itemRoutes);
router.use('/supply-centers', [cacheMiddleware(PUBLIC_CACHE_TTL)], supplyCenterRoutes);
router.use('/carriers', [cacheMiddleware(PUBLIC_CACHE_TTL)], carrierRoutes);
router.use('/inventory', [cacheMiddleware(PUBLIC_CACHE_TTL)], inventoryRoutes);
router.use('/dispatches', [cacheMiddleware(PUBLIC_CACHE_TTL)], dispatchesRoutes);
router.use('/emergency-needs', [cacheMiddleware(PUBLIC_CACHE_TTL)], emergencyNeedsRoutes);

export default router;
