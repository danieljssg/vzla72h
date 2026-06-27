import logger from '../../config/logger.js';
import Carrier from '../../shared/models/Carrier.js';

export const listCarriers = async (request, reply) => {
  try {
    const page = Math.max(parseInt(request.query.page, 10) || 1, 1);
    const rawLimit = parseInt(request.query.limit, 10) || 50;
    const limit = Math.min(Math.max(rawLimit, 1), 200);
    const skip = (page - 1) * limit;

    const filter = {};
    if (typeof request.query.status === 'string' && request.query.status.length > 0) {
      filter.status = request.query.status;
    }
    if (typeof request.query.vehicleType === 'string' && request.query.vehicleType.length > 0) {
      filter.vehicleType = request.query.vehicleType;
    }

    const [carriers, total] = await Promise.all([
      Carrier.find(filter).sort({ licensePlate: 1 }).skip(skip).limit(limit).lean(),
      Carrier.countDocuments(filter),
    ]);

    return reply.code(200).send({
      success: true,
      data: carriers,
      page,
      limit,
      total,
      hasMore: skip + carriers.length < total,
    });
  } catch (error) {
    logger.error('[carriers.controller] listCarriers error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};

export const getCarrierById = async (request, reply) => {
  try {
    const carrier = await Carrier.findById(request.params.id).lean();
    if (!carrier) {
      return reply.code(404).send({ success: false, error: 'Carrier not found' });
    }
    return reply.code(200).send({ success: true, data: carrier });
  } catch (error) {
    logger.error('[carriers.controller] getCarrierById error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};

export const createCarrier = async (request, reply) => {
  try {
    const carrier = await Carrier.create(request.body);
    return reply.code(201).send({ success: true, data: carrier });
  } catch (error) {
    if (error.code === 11000) {
      return reply
        .code(409)
        .send({ success: false, error: 'A carrier with this license plate already exists' });
    }
    if (error.name === 'ValidationError') {
      return reply
        .code(400)
        .send({ success: false, error: 'Validation failed', details: error.errors });
    }
    logger.error('[carriers.controller] createCarrier error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};

export const updateCarrier = async (request, reply) => {
  try {
    const carrier = await Carrier.findByIdAndUpdate(
      request.params.id,
      { $set: request.body },
      { new: true, runValidators: true },
    ).lean();
    if (!carrier) {
      return reply.code(404).send({ success: false, error: 'Carrier not found' });
    }
    return reply.code(200).send({ success: true, data: carrier });
  } catch (error) {
    if (error.code === 11000) {
      return reply
        .code(409)
        .send({ success: false, error: 'A carrier with this license plate already exists' });
    }
    if (error.name === 'ValidationError') {
      return reply
        .code(400)
        .send({ success: false, error: 'Validation failed', details: error.errors });
    }
    logger.error('[carriers.controller] updateCarrier error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};

export const updateCarrierStatus = async (request, reply) => {
  try {
    const { status } = request.body;
    const carrier = await Carrier.findByIdAndUpdate(
      request.params.id,
      { $set: { status } },
      { new: true, runValidators: true },
    ).lean();
    if (!carrier) {
      return reply.code(404).send({ success: false, error: 'Carrier not found' });
    }
    return reply.code(200).send({ success: true, data: carrier });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return reply
        .code(400)
        .send({ success: false, error: 'Validation failed', details: error.errors });
    }
    logger.error('[carriers.controller] updateCarrierStatus error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};

export const deleteCarrier = async (request, reply) => {
  try {
    const carrier = await Carrier.findByIdAndUpdate(
      request.params.id,
      { $set: { status: 'inactive' } },
      { new: true },
    ).lean();
    if (!carrier) {
      return reply.code(404).send({ success: false, error: 'Carrier not found' });
    }
    return reply
      .code(200)
      .send({ success: true, data: { id: carrier._id, status: carrier.status } });
  } catch (error) {
    logger.error('[carriers.controller] deleteCarrier error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};
