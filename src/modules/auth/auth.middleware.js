import { verifyToken } from '../../config/jwt.js';
import logger from '../../config/logger.js';

export const validateSign = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access denied, token not found' });
  }
  try {
    const tokenDecoded = verifyToken(token);
    if (!tokenDecoded) {
      return res.status(401).json({ message: 'Access denied, invalid token' });
    }
    req.user = tokenDecoded;
    return next();
  } catch (error) {
    logger.error('Validate sign error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Access denied, token expired' });
    }
    return res.status(403).json({ message: 'Access denied, invalid token' });
  }
};
