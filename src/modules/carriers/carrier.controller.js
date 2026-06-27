import logger from '../../config/logger.js';
import Carrier from '../../shared/models/Carrier.js';
import { fromGeoPoint, parseNearQuery, toGeoPoint } from '../../utils/geo.js';

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
    const body = { ...request.body };
    if (body.lat !== undefined || body.lng !== undefined) {
      const point = toGeoPoint({ lat: body.lat, lng: body.lng });
      if (point) body.location = point;
      delete body.lat;
      delete body.lng;
    }
    const carrier = await Carrier.create(body);
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
    const update = { ...request.body };
    if (update.lat !== undefined || update.lng !== undefined) {
      const point = toGeoPoint({ lat: update.lat, lng: update.lng });
      if (point) update.location = point;
      delete update.lat;
      delete update.lng;
    }
    const carrier = await Carrier.findByIdAndUpdate(
      request.params.id,
      { $set: update },
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

/**
 * GET /api/carriers/near?lat=X&lng=Y&maxDistance=5000
 * Devuelve transportistas del más cercano al más lejano.
 */
export const nearCarriers = async (request, reply) => {
  try {
    let coords;
    try {
      coords = parseNearQuery(request.query);
    } catch (e) {
      return reply.code(400).send({ success: false, error: e.message });
    }
    if (!coords) {
      return reply.code(400).send({ success: false, error: 'lat and lng are required' });
    }

    const limit = Math.min(Math.max(parseInt(request.query.limit, 10) || 50, 1), 200);
    const match = { status: { $ne: 'inactive' } };
    if (typeof request.query.status === 'string' && request.query.status.length > 0) {
      match.status = request.query.status;
    }

    const results = await Carrier.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [coords.lng, coords.lat] },
          distanceField: 'distanceMeters',
          maxDistance: coords.maxDistance,
          spherical: true,
          query: match,
        },
      },
      { $limit: limit },
    ]);

    return reply.code(200).send({
      success: true,
      data: results,
      origin: { lat: coords.lat, lng: coords.lng },
      maxDistance: coords.maxDistance,
      count: results.length,
    });
  } catch (error) {
    logger.error('[carriers.controller] nearCarriers error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};
