import logger from '../../config/logger.js';
import Carrier from '../../shared/models/Carrier.js';

export const listCarriers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const rawLimit = parseInt(req.query.limit, 10) || 50;
    const limit = Math.min(Math.max(rawLimit, 1), 200);
    const skip = (page - 1) * limit;

    const filter = {};
    if (typeof req.query.status === 'string' && req.query.status.length > 0) {
      filter.status = req.query.status;
    }
    if (typeof req.query.vehicleType === 'string' && req.query.vehicleType.length > 0) {
      filter.vehicleType = req.query.vehicleType;
    }

    const [carriers, total] = await Promise.all([
      Carrier.find(filter).sort({ licensePlate: 1 }).skip(skip).limit(limit).lean(),
      Carrier.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: carriers,
      page,
      limit,
      total,
      hasMore: skip + carriers.length < total,
    });
  } catch (error) {
    logger.error('[carriers.controller] listCarriers error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getCarrierById = async (req, res) => {
  try {
    const carrier = await Carrier.findById(req.params.id).lean();
    if (!carrier) {
      return res.status(404).json({ success: false, error: 'Carrier not found' });
    }
    return res.status(200).json({ success: true, data: carrier });
  } catch (error) {
    logger.error('[carriers.controller] getCarrierById error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createCarrier = async (req, res) => {
  try {
    const carrier = await Carrier.create(req.body);
    return res.status(201).json({ success: true, data: carrier });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ success: false, error: 'A carrier with this license plate already exists' });
    }
    if (error.name === 'ValidationError') {
      return res
        .status(400)
        .json({ success: false, error: 'Validation failed', details: error.errors });
    }
    logger.error('[carriers.controller] createCarrier error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateCarrier = async (req, res) => {
  try {
    const carrier = await Carrier.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true },
    ).lean();
    if (!carrier) {
      return res.status(404).json({ success: false, error: 'Carrier not found' });
    }
    return res.status(200).json({ success: true, data: carrier });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ success: false, error: 'A carrier with this license plate already exists' });
    }
    if (error.name === 'ValidationError') {
      return res
        .status(400)
        .json({ success: false, error: 'Validation failed', details: error.errors });
    }
    logger.error('[carriers.controller] updateCarrier error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateCarrierStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const carrier = await Carrier.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true, runValidators: true },
    ).lean();
    if (!carrier) {
      return res.status(404).json({ success: false, error: 'Carrier not found' });
    }
    return res.status(200).json({ success: true, data: carrier });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res
        .status(400)
        .json({ success: false, error: 'Validation failed', details: error.errors });
    }
    logger.error('[carriers.controller] updateCarrierStatus error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteCarrier = async (req, res) => {
  try {
    const carrier = await Carrier.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'inactive' } },
      { new: true },
    ).lean();
    if (!carrier) {
      return res.status(404).json({ success: false, error: 'Carrier not found' });
    }
    return res
      .status(200)
      .json({ success: true, data: { id: carrier._id, status: carrier.status } });
  } catch (error) {
    logger.error('[carriers.controller] deleteCarrier error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
