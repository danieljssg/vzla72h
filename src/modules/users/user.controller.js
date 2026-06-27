import logger from '../../config/logger.js';
import User from '../../shared/models/User.js';
import {
  createNewUser,
  createUsersInBatch,
  deleteUser,
  getAllDescendants,
  getTeamMembers,
  getUserByTagId,
  moveUserToNewHierarchy,
  updateUser,
} from './user.service.js';

// ==================== CRUD DE USUARIOS ====================

export const getAllUsers = async (_request, reply) => {
  try {
    const users = await User.find({ isActive: true });
    return reply.send({
      success: true,
      data: users,
      count: users.length,
    });
  } catch (error) {
    logger.error(error);
    return reply.code(400).send({ success: false, error: error.message });
  }
};

/**
 * Obtener perfil de usuario por tagId
 */
export const getProfile = async (request, reply) => {
  try {
    const { tagId } = request.params;
    const user = await getUserByTagId(tagId);
    return reply.send({ success: true, data: user });
  } catch (error) {
    logger.error(error);
    return reply.code(404).send({ success: false, error: error.message });
  }
};

/**
 * Crear nuevo usuario
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
    logger.error('Error creating user:', error);
    if (error.name === 'ZodError') {
      return reply.code(400).send({
        success: false,
        error: 'Validation failed',
        details: error.issues,
      });
    }
    return reply.code(400).send({ success: false, error: error.message });
  }
};

/**
 * Actualizar usuario
 */
export const updateSettings = async (request, reply) => {
  try {
    const { tagId } = request.params;
    const user = await updateUser(tagId, request.body);
    return reply.send({
      success: true,
      data: user,
      message: 'User updated successfully',
    });
  } catch (error) {
    logger.error('Error updating user:', error);
    if (error.name === 'ZodError') {
      return reply.code(400).send({
        success: false,
        error: 'Validation failed',
        details: error.issues,
      });
    }
    return reply.code(400).send({ success: false, error: error.message });
  }
};

/**
 * Obtener miembros del equipo
 */
export const getMyTeam = async (request, reply) => {
  try {
    const { tagId } = request.params;
    const teamMembers = await getTeamMembers(tagId);
    return reply.send({
      success: true,
      data: teamMembers,
      count: teamMembers.length,
    });
  } catch (error) {
    logger.error('Error getting team members:', error);
    return reply.code(400).send({ success: false, error: error.message });
  }
};

/**
 * Obtener jerarquía completa
 */
export const getHierarchy = async (request, reply) => {
  try {
    const { tagId } = request.params;
    const descendants = await getAllDescendants(tagId);
    return reply.send({
      success: true,
      data: descendants,
      count: descendants.length,
    });
  } catch (error) {
    logger.error('Error getting hierarchy:', error);
    return reply.code(400).send({ success: false, error: error.message });
  }
};

/**
 * Eliminar usuario (soft delete)
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
    logger.error('Error deleting user:', error);
    return reply.code(400).send({ success: false, error: error.message });
  }
};

/**
 * Mover usuario en la jerarquía
 */
export const moveUser = async (request, reply) => {
  try {
    const { tagId } = request.params;
    const { newParentTagId } = request.body;
    const user = await moveUserToNewHierarchy(tagId, newParentTagId);
    return reply.send({
      success: true,
      data: user,
      message: 'User moved successfully',
    });
  } catch (error) {
    logger.error('Error moving user:', error);
    return reply.code(400).send({ success: false, error: error.message });
  }
};

/**
 * Crear múltiples usuarios en batch
 */
export const createBatch = async (request, reply) => {
  try {
    const { users } = request.body;

    if (!Array.isArray(users) || users.length === 0) {
      return reply.code(400).send({
        success: false,
        error: 'Users array is required and must not be empty',
      });
    }

    const createdUsers = await createUsersInBatch(users);
    return reply.code(201).send({
      success: true,
      data: createdUsers,
      count: createdUsers.length,
      message: `${createdUsers.length} users created successfully`,
    });
  } catch (error) {
    logger.error('Error creating users in batch:', error);
    return reply.code(400).send({ success: false, error: error.message });
  }
};
