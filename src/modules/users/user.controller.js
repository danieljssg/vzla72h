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

export const getAllUsers = async (_req, res) => {
  try {
    const users = await User.find({ isActive: true }).select('-password');
    res.json({
      success: true,
      data: users,
      count: users.length,
    });
  } catch (error) {
    logger.error(error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Obtener perfil de usuario por tagId
 */
export const getProfile = async (req, res) => {
  try {
    const { tagId } = req.params;

    const user = await getUserByTagId(tagId);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error(error);
    res.status(404).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Crear nuevo usuario (requiere autenticación)
 */
export const create = async (req, res) => {
  try {
    const modifierId = req.user?.id; // ID del usuario autenticado
    const user = await createNewUser(req.body, modifierId);

    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully',
    });
  } catch (error) {
    logger.error('Error creating user:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }

    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Actualizar usuario
 */
export const updateSettings = async (req, res) => {
  try {
    const { tagId } = req.params;
    const modifierId = req.user?.id;

    const user = await updateUser(tagId, req.body, modifierId);

    res.json({
      success: true,
      data: user,
      message: 'User updated successfully',
    });
  } catch (error) {
    logger.error('Error updating user:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }

    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Obtener miembros del equipo
 */
export const getMyTeam = async (req, res) => {
  try {
    const { tagId } = req.params;

    const teamMembers = await getTeamMembers(tagId);

    res.json({
      success: true,
      data: teamMembers,
      count: teamMembers.length,
    });
  } catch (error) {
    logger.error('Error getting team members:', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Obtener jerarquía completa
 */
export const getHierarchy = async (req, res) => {
  try {
    const { tagId } = req.params;

    const descendants = await getAllDescendants(tagId);

    res.json({
      success: true,
      data: descendants,
      count: descendants.length,
    });
  } catch (error) {
    logger.error('Error getting hierarchy:', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Eliminar usuario (soft delete)
 */
export const remove = async (req, res) => {
  try {
    const { tagId } = req.params;
    const modifierId = req.user?.id;

    const user = await deleteUser(tagId, modifierId);

    res.json({
      success: true,
      data: user,
      message: 'User deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Mover usuario en la jerarquía
 */
export const moveUser = async (req, res) => {
  try {
    const { tagId } = req.params;
    const { newParentTagId } = req.body;
    const modifierId = req.user?.id;

    const user = await moveUserToNewHierarchy(tagId, newParentTagId, modifierId);

    res.json({
      success: true,
      data: user,
      message: 'User moved successfully',
    });
  } catch (error) {
    logger.error('Error moving user:', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Crear múltiples usuarios en batch
 */
export const createBatch = async (req, res) => {
  try {
    const { users } = req.body;
    const modifierId = req.user?.id;

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Users array is required and must not be empty',
      });
    }

    const createdUsers = await createUsersInBatch(users, modifierId);

    res.status(201).json({
      success: true,
      data: createdUsers,
      count: createdUsers.length,
      message: `${createdUsers.length} users created successfully`,
    });
  } catch (error) {
    logger.error('Error creating users in batch:', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};
