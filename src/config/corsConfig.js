const corsConfig = {
  origin: (origin, cb) => {
    if (process.env.NODE_ENV === 'development') {
      return cb(null, true);
    }

    const allowedOrigins =
      process.env.ALLOWED_ORIGINS?.split(',')
        .map((o) => o.trim())
        .filter(Boolean) || [];

    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-refresh'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
};

export default corsConfig;
