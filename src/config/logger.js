import fs from 'node:fs';
import winston from 'winston';

const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

logger.add(
  new winston.transports.Console({
    format:
      process.env.NODE_ENV === 'production'
        ? winston.format.combine(
            winston.format.printf(({ message, stack }) => {
              return stack || message;
            }),
          )
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'DD-MM-YYYY HH:mm:ss' }),
            winston.format.printf(({ timestamp, level, message, stack }) => {
              return `${timestamp} [${level}]: ${stack || message}`;
            }),
          ),
  }),
);

export default logger;
