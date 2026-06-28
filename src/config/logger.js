import fs from 'node:fs';
import pino from 'pino';

const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const isProduction = process.env.NODE_ENV === 'production';

const transport = isProduction
  ? undefined
  : pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'DD-MM-YYYY HH:mm:ss',
        ignore: 'pid,hostname',
        singleLine: false,
      },
    });

const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    base: { service: 'venezuela-route72-api' },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
    // Serialize Error objects so the message/stack are visible in logs.
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
    },
  },
  transport ?? pino.destination({ dest: 'logs/combined.log', sync: false, mkdir: true }),
);

export default logger;
