import { Router } from 'express';
import { cacheMiddleware } from '../../api/middlewares/cache.js';
import { createItemSchema, updateItemSchema } from '../../utils/validations/schemas/itemSchema.js';
import zodValidate from '../../utils/validations/zodValidator.js';
import { createItem, deleteItem, getItemById, listItems, updateItem } from './item.controller.js';

const router = Router();

router.get('/', [cacheMiddleware(300)], listItems);
router.get('/:id', getItemById);
router.post('/', zodValidate(createItemSchema), createItem);
router.put('/:id', zodValidate(updateItemSchema), updateItem);
router.delete('/:id', deleteItem);

export default router;
