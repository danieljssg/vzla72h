export * from './oauth.controller.js';

import { clearCache } from '../../api/middlewares/cache.js';
import { generateToken } from '../../config/jwt.js';
import logger from '../../config/logger.js';
import { addJob } from '../../jobs/queues/main.queue.js';
import User from '../../shared/models/User.js';
import { createNewUser } from '../users/user.service.js';
// ==================== AUTENTICACIÓN ====================

/**
 * Registro de nuevo usuario (signup)
 */
export const signUp = async (req, res) => {
  try {
    const userData = req.body;

    // Crear usuario (el service ya valida campos únicos)
    const user = await createNewUser(userData);

    // Generar token
    const tokenData = generateToken(user);

    res.status(201).json({
      success: true,
      ...tokenData,
      message: 'User registered successfully',
    });
  } catch (error) {
    logger.error(error);
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
 * Inicio de sesión (signin)
 */
export const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario por email
    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Verificar contraseña
    const isPasswordValid = await User.comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Actualizar último login
    user.lastLogin = new Date();
    await user.save();

    // Generar token
    const tokenData = generateToken(user);

    res.json({
      success: true,
      ...tokenData,
      message: 'Login successful',
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
 * Validar usuario autenticado (obtener perfil desde token)
 */
export const validateUser = async (req, res) => {
  try {
    // req.user viene del middleware validateSign
    const userId = req.user.id;

    const user = await User.findById(userId).select('-password');
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        error: 'User not found or inactive',
      });
    }

    res.json({
      success: true,
      user,
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
 * Refrescar token
 */
export const refreshToken = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        error: 'User not found or inactive',
      });
    }

    const tokenData = generateToken(user);

    res.json({
      success: true,
      ...tokenData,
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    logger.error(error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

export const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.split(' ')[1];
    const csrfToken = req.headers['x-csrf-token'];

    if (req.user?.id) {
      await clearCache(req.user.id);
    }
    if (bearerToken) {
      await clearCache(bearerToken);
    }
    if (csrfToken) {
      await clearCache(csrfToken);
    }

    res.clearCookie('x-csrf-token');
    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const purgeUserData = async (req, res) => {
  try {
    const userId = req.user.id;
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.split(' ')[1];
    const csrfToken = req.headers['x-csrf-token'];

    if (req.user?.id) {
      await clearCache(req.user.id);
    }
    if (bearerToken) {
      await clearCache(bearerToken);
    }
    if (csrfToken) {
      await clearCache(csrfToken);
    }

    await addJob('USER_PURGE', {
      userId,
    });

    const cookieOptions = {
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.spotzlabs.site' : undefined,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      expires: new Date(0)
    };

    res.clearCookie('session_token', cookieOptions);
    res.clearCookie('x-csrf-token', cookieOptions);
    return res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    logger.error('[auth.controller] purgeUserData error:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};
