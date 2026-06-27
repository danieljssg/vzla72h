import logger from '../../config/logger.js';
import User from '../../shared/models/User.js';

export const checkHierarchy = async (req, res, next) => {
  try {
    const userTagId = req.user?.tagId || req.headers['x-user-tagid'];

    if (!userTagId) {
      return res.status(401).json({
        success: false,
        error: 'User tag ID is required',
      });
    }

    const user = await User.findOne({ tagId: userTagId, activo: true });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive',
      });
    }

    const targetTagId = req.params.tagId;
    if (targetTagId) {
      const targetUser = await User.findOne({ tagId: targetTagId, activo: true });
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: 'Target user not found',
        });
      }

      if (!user.path.includes(targetTagId) && user.tagId !== targetTagId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: insufficient hierarchy permissions',
        });
      }
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Hierarchy check error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during hierarchy validation',
    });
  }
};

export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: insufficient role permissions',
      });
    }

    next();
  };
};

export const canManageUser = async (req, res, next) => {
  try {
    const managerTagId = req.user?.tagId;
    const targetTagId = req.params.tagId;

    if (!managerTagId || !targetTagId) {
      return res.status(400).json({
        success: false,
        error: 'Manager and target tag IDs are required',
      });
    }

    const manager = await User.findOne({ tagId: managerTagId, activo: true });
    const target = await User.findOne({ tagId: targetTagId, activo: true });

    if (!manager || !target) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    if (manager.role === 'ADMIN' || manager.role === 'GERENTE_GENERAL') {
      return next();
    }

    if (manager.path.includes(targetTagId)) {
      return res.status(403).json({
        success: false,
        error: 'Cannot manage a user who is above you in hierarchy',
      });
    }

    if (!target.path.includes(managerTagId) && manager.tagId !== targetTagId) {
      return res.status(403).json({
        success: false,
        error: 'Can only manage users in your hierarchy',
      });
    }

    next();
  } catch (error) {
    logger.error('User management permission check error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during permission validation',
    });
  }
};
