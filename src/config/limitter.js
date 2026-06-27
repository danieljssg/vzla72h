import rateLimit from 'express-rate-limit';
export const limiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Demasiadas peticiones desde esta IP, por favor intenta de nuevo en unos minutos.',
    });
  },
});

export const analysisLimitter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Límite de análisis alcanzado, por favor intenta de nuevo en 5 minutos.',
    });
  },
});
