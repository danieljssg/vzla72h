import logger from '../../config/logger.js';
import Item from '../../shared/models/Item.js';

export const listItems = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const rawLimit = parseInt(req.query.limit, 10) || 50;
    const limit = Math.min(Math.max(rawLimit, 1), 200);
    const skip = (page - 1) * limit;

    const filter = {};
    if (typeof req.query.category === 'string' && req.query.category.length > 0) {
      filter.category = req.query.category;
    }
    if (typeof req.query.q === 'string' && req.query.q.trim().length > 0) {
      const safe = req.query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.name = { $regex: safe, $options: 'i' };
    }

    const [items, total] = await Promise.all([
      Item.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      Item.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: items,
      page,
      limit,
      total,
      hasMore: skip + items.length < total,
    });
  } catch (error) {
    logger.error('[items.controller] listItems error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).lean();
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    return res.status(200).json({ success: true, data: item });
  } catch (error) {
    logger.error('[items.controller] getItemById error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createItem = async (req, res) => {
  try {
    const item = await Item.create(req.body);
    return res.status(201).json({ success: true, data: item });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, error: 'Item with this name already exists' });
    }
    if (error.name === 'ValidationError') {
      return res
        .status(400)
        .json({ success: false, error: 'Validation failed', details: error.errors });
    }
    logger.error('[items.controller] createItem error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateItem = async (req, res) => {
  try {
    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      {
        new: true,
        runValidators: true,
      },
    ).lean();
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    return res.status(200).json({ success: true, data: item });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, error: 'Item with this name already exists' });
    }
    if (error.name === 'ValidationError') {
      return res
        .status(400)
        .json({ success: false, error: 'Validation failed', details: error.errors });
    }
    logger.error('[items.controller] updateItem error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id).lean();
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    return res.status(200).json({ success: true, data: { id: item._id } });
  } catch (error) {
    logger.error('[items.controller] deleteItem error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
