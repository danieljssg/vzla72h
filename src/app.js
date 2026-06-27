import { RedisStore } from 'connect-redis';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import morgan from 'morgan';
import apiRouter from './api/routes/router.js';
import corsConfig from './config/corsConfig.js';
import { limiter } from './config/limitter.js';
import logger from './config/logger.js';
import { SessionConnection } from './config/redis.js';

const app = express();

app.use(cors(corsConfig));

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  }),
);
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.set('trust proxy', 1);
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(
  session({
    store: new RedisStore({ client: SessionConnection }),
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    },
  }),
);
app.disable('x-powered-by');

app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

//* API ROUTES
app.use('/api', apiRouter);

//* STATIC FILES — carrier photos written by the main.worker PROCESS_CARRIER_PHOTO job
app.use('/uploads', express.static('/app/storage/carriers'));
app.use('/uploads/requests', express.static('/app/storage/requests'));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || '1.0.0',
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
  });
});

app.use((err, _req, res, _next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid or missing CSRF token',
    });
  }

  logger.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

export default app;
