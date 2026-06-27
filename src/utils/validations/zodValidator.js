import { z } from 'zod';
import logger from '../../config/logger.js';

const zodValidator = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Error de validación:', error.errors);
      return res.status(400).json({
        message: 'Error de validación',
        errors: error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      });
    }
    next(error);
  }
};

export default zodValidator;
