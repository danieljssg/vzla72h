import logger from '../../config/logger.js';
import SupplyCenter from '../../shared/models/SupplyCenter.js';

export const listSupplyCenters = async (request, reply) => {
  try {
    const page = Math.max(parseInt(request.query.page, 10) || 1, 1);
    const rawLimit = parseInt(request.query.limit, 10) || 50;
    const limit = Math.min(Math.max(rawLimit, 1), 200);
    const skip = (page - 1) * limit;

    const filter = {};
    if (typeof request.query.state === 'string' && request.query.state.length > 0) {
      filter['location.state'] = request.query.state;
    }
    if (typeof request.query.city === 'string' && request.query.city.length > 0) {
      filter['location.city'] = request.query.city;
    }
    if (request.query.isActive !== undefined) {
      filter.isActive = request.query.isActive === 'true';
    }

    const [centers, total] = await Promise.all([
      SupplyCenter.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      SupplyCenter.countDocuments(filter),
    ]);

    return reply.code(200).send({
      success: true,
      data: centers,
      page,
      limit,
      total,
      hasMore: skip + centers.length < total,
    });
  } catch (error) {
    logger.error('[supply-centers.controller] listSupplyCenters error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};

export const getSupplyCenterById = async (request, reply) => {
  try {
    const center = await SupplyCenter.findById(request.params.id).lean();
    if (!center) {
      return reply.code(404).send({ success: false, error: 'SupplyCenter not found' });
    }
    return reply.code(200).send({ success: true, data: center });
  } catch (error) {
    logger.error('[supply-centers.controller] getSupplyCenterById error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};

export const createSupplyCenter = async (request, reply) => {
  try {
    const center = await SupplyCenter.create(request.body);
    return reply.code(201).send({ success: true, data: center });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return reply
        .code(400)
        .send({ success: false, error: 'Validation failed', details: error.errors });
    }
    if (error.name === 'CastError') {
      return reply.code(400).send({ success: false, error: 'Invalid ObjectId' });
    }
    logger.error('[supply-centers.controller] createSupplyCenter error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};

export const updateSupplyCenter = async (request, reply) => {
  try {
    const center = await SupplyCenter.findByIdAndUpdate(
      request.params.id,
      { $set: request.body },
      { new: true, runValidators: true },
    ).lean();
    if (!center) {
      return reply.code(404).send({ success: false, error: 'SupplyCenter not found' });
    }
    return reply.code(200).send({ success: true, data: center });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return reply
        .code(400)
        .send({ success: false, error: 'Validation failed', details: error.errors });
    }
    if (error.name === 'CastError') {
      return reply.code(400).send({ success: false, error: 'Invalid ObjectId' });
    }
    logger.error('[supply-centers.controller] updateSupplyCenter error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};

export const deleteSupplyCenter = async (request, reply) => {
  try {
    const center = await SupplyCenter.findByIdAndUpdate(
      request.params.id,
      { $set: { isActive: false } },
      { new: true },
    ).lean();
    if (!center) {
      return reply.code(404).send({ success: false, error: 'SupplyCenter not found' });
    }
    return reply
      .code(200)
      .send({ success: true, data: { id: center._id, isActive: center.isActive } });
  } catch (error) {
    if (error.name === 'CastError') {
      return reply.code(400).send({ success: false, error: 'Invalid ObjectId' });
    }
    logger.error('[supply-centers.controller] deleteSupplyCenter error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};
