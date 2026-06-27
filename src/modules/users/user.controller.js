import logger from '../../config/logger.js';
import User from '../../shared/models/User.js';
import { createNewUser, deleteUser, getAllUsers } from './user.service.js';

/**
 * GET /api/users/
 * Lista los usuarios activos. Soporta paginación y filtro por supplyCenter.
 */
export const list = async (request, reply) => {
  try {
    const users = await getAllUsers(request.query);
    return reply.send({ success: true, data: users, count: users.length });
  } catch (error) {
    logger.error('[users.controller] list error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};

/**
 * POST /api/users/
 * Crea un nuevo usuario. El frontend (better-auth) se encarga del flujo
 * de autenticación. Aquí solo se mantienen los datos básicos del perfil
 * y la referencia opcional a un centro de acopio.
 */
export const create = async (request, reply) => {
  try {
    const user = await createNewUser(request.body);
    return reply.code(201).send({
      success: true,
      data: user,
      message: 'User created successfully',
    });
  } catch (error) {
    logger.error('[users.controller] create error:', error);
    if (error.name === 'ZodError') {
      return reply
        .code(400)
        .send({ success: false, error: 'Validation failed', details: error.issues });
    }
    if (error.code === 11000) {
      return reply.code(409).send({ success: false, error: 'Email already exists' });
    }
    return reply.code(400).send({ success: false, error: error.message });
  }
};

/**
 * DELETE /api/users/:tagId
 * Soft delete: marca isActive=false. El usuario permanece en la base
 * para auditoría, pero no aparece en los listados.
 */
export const remove = async (request, reply) => {
  try {
    const { tagId } = request.params;
    const user = await deleteUser(tagId);
    return reply.send({
      success: true,
      data: user,
      message: 'User deleted successfully',
    });
  } catch (error) {
    logger.error('[users.controller] remove error:', error);
    return reply.code(400).send({ success: false, error: error.message });
  }
};

/**
 * GET /api/users/by-id/:id
 * Obtiene un usuario por su _id de Mongo (útil para resolver referencias).
 */
export const getById = async (request, reply) => {
  try {
    const user = await User.findById(request.params.id).lean();
    if (!user) {
      return reply.code(404).send({ success: false, error: 'User not found' });
    }
    return reply.send({ success: true, data: user });
  } catch (error) {
    if (error.name === 'CastError') {
      return reply.code(400).send({ success: false, error: 'Invalid ObjectId' });
    }
    logger.error('[users.controller] getById error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};
