import 'dotenv/config';
import app from './src/app.js';
import connectDb from './src/config/db.js';
import logger from './src/config/logger.js';

const PORT = process.env.PORT || 3100;
const HOST = process.env.HOST || 'localhost';

async function startServer() {
  try {
    await connectDb();
    logger.info('✅ MongoDB connected');

    app.listen(PORT, HOST, () => {
      logger.info(`🚀 AI'nfold API http://${HOST}:${PORT}`);
      logger.info(`🛠  Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('❌ Fatal error starting the application:');
    logger.error(error);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection at Promise:', reason);
});

startServer();
