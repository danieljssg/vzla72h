import logger from '../../config/logger.js';
import SupplyCenter from '../../shared/models/SupplyCenter.js';

export const listSupplyCenters = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const rawLimit = parseInt(req.query.limit, 10) || 50;
    const limit = Math.min(Math.max(rawLimit, 1), 200);
    const skip = (page - 1) * limit;

    const filter = {};
    if (typeof req.query.state === 'string' && req.query.state.length > 0) {
      filter['location.state'] = req.query.state;
    }
    if (typeof req.query.city === 'string' && req.query.city.length > 0) {
      filter['location.city'] = req.query.city;
    }
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    const [centers, total] = await Promise.all([
      SupplyCenter.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      SupplyCenter.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: centers,
      page,
      limit,
      total,
      hasMore: skip + centers.length < total,
    });
  } catch (error) {
    logger.error('[supply-centers.controller] listSupplyCenters error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getSupplyCenterById = async (req, res) => {
  try {
    const center = await SupplyCenter.findById(req.params.id).lean();
    if (!center) {
      return res.status(404).json({ success: false, error: 'SupplyCenter not found' });
    }
    return res.status(200).json({ success: true, data: center });
  } catch (error) {
    logger.error('[supply-centers.controller] getSupplyCenterById error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createSupplyCenter = async (req, res) => {
  try {
    const center = await SupplyCenter.create(req.body);
    return res.status(201).json({ success: true, data: center });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res
        .status(400)
        .json({ success: false, error: 'Validation failed', details: error.errors });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, error: 'Invalid ObjectId' });
    }
    logger.error('[supply-centers.controller] createSupplyCenter error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateSupplyCenter = async (req, res) => {
  try {
    const center = await SupplyCenter.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true },
    ).lean();
    if (!center) {
      return res.status(404).json({ success: false, error: 'SupplyCenter not found' });
    }
    return res.status(200).json({ success: true, data: center });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res
        .status(400)
        .json({ success: false, error: 'Validation failed', details: error.errors });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, error: 'Invalid ObjectId' });
    }
    logger.error('[supply-centers.controller] updateSupplyCenter error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteSupplyCenter = async (req, res) => {
  try {
    const center = await SupplyCenter.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true },
    ).lean();
    if (!center) {
      return res.status(404).json({ success: false, error: 'SupplyCenter not found' });
    }
    return res
      .status(200)
      .json({ success: true, data: { id: center._id, isActive: center.isActive } });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, error: 'Invalid ObjectId' });
    }
    logger.error('[supply-centers.controller] deleteSupplyCenter error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
