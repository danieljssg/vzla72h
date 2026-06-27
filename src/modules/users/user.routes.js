import { createUserSchema } from '../../utils/validations/schemas/userSchema.js';
import { create, getById, list, remove } from './user.controller.js';

/**
 * Rutas mínimas de gestión de usuarios.
 *
 * La autenticación corre en el frontend (better-auth), por lo que
 * el backend solo expone CRUD básico para que el frontend pueda
 * mantener un perfil asociado y resolver referencias entre módulos
 * (p.ej. supplyCenter en User, createdBy en Dispatch, etc.).
 */
export default async function userRoutes(app) {
  app.get('/', list);
  app.post('/', { preHandler: app.validateBody(createUserSchema) }, create);
  app.delete('/:tagId', remove);
  app.get('/by-id/:id', getById);
}
