import { cachePreHandler } from '../../plugins/cache.js';
import { createItemSchema, updateItemSchema } from '../../utils/validations/schemas/itemSchema.js';
import { createItem, deleteItem, getItemById, listItems, updateItem } from './item.controller.js';

const PUBLIC_CACHE_TTL = 300;
const readCache = cachePreHandler(PUBLIC_CACHE_TTL);

export default async function itemRoutes(app) {
  app.get('/', { preHandler: readCache }, listItems);
  app.get('/:id', getItemById);
  app.post('/', { preHandler: app.validateBody(createItemSchema) }, createItem);
  app.put('/:id', { preHandler: app.validateBody(updateItemSchema) }, updateItem);
  app.delete('/:id', deleteItem);
}
