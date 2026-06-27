import mongoose from 'mongoose';
import logger from './logger.js';

const connectDb = async () => {
  const { MONGO_URI, MONGO_DB_NAME, MONGO_QUERY_PARAMS } = process.env;

  if (!MONGO_URI || !MONGO_DB_NAME) {
    logger.error('Faltan variables de entorno para la conexión a MongoDB (URI o DB_NAME)');
    process.exit(1);
  }

  const fullUri = `${MONGO_URI}/${MONGO_DB_NAME}${MONGO_QUERY_PARAMS || ''}`;

  try {
    const conn = await mongoose.connect(fullUri, {
      autoIndex: true,
    });

    logger.info(`✅ MongoDB Conectado: ${conn.connection.host} / ${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      logger.error(`Error de conexión en tiempo de ejecución: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Se ha perdido la conexión con MongoDB. Reintentando...');
    });
  } catch (error) {
    logger.error(`❌ Error al conectar a MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDb;
