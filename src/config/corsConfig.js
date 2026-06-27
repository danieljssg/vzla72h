const corsConfig = {
  origin: (origin, callback) => {
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()) || [];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-csrf-token'],
};

export default corsConfig;
