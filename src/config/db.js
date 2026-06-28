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

    logger.info(`MongoDB Conectado: ${conn.connection.host} / ${conn.connection.name}`);

    // Drop the legacy 2dsphere index that pointed at the whole `location`
    // sub-document (which is not a GeoJSON object). Mongoose will create
    // the corrected `location.coordinates_2dsphere` index automatically
    // on startup (autoIndex: true). Safe to run if the old index is gone.
    try {
      const coll = mongoose.connection.db.collection('supplycenters');
      const indexes = await coll.indexes();
      const legacy = indexes.find((idx) => idx.name === 'location_2dsphere');
      if (legacy) {
        await coll.dropIndex('location_2dsphere');
        logger.info('Índice obsoleto `location_2dsphere` eliminado de supplycenters');
      }
    } catch (idxErr) {
      logger.warn(`No se pudo limpiar el índice obsoleto: ${idxErr.message}`);
    }

    mongoose.connection.on('error', (err) => {
      logger.error(`Error de conexión en tiempo de ejecución: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Se ha perdido la conexión con MongoDB. Reintentando...');
    });
  } catch (error) {
    logger.error(`Error al conectar a MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDb;
