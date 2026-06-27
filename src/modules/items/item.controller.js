import logger from '../../config/logger.js';
import Item from '../../shared/models/Item.js';

export const listItems = async (request, reply) => {
  try {
    const page = Math.max(parseInt(request.query.page, 10) || 1, 1);
    const rawLimit = parseInt(request.query.limit, 10) || 50;
    const limit = Math.min(Math.max(rawLimit, 1), 200);
    const skip = (page - 1) * limit;

    const filter = {};
    if (typeof request.query.category === 'string' && request.query.category.length > 0) {
      filter.category = request.query.category;
    }
    if (typeof request.query.q === 'string' && request.query.q.trim().length > 0) {
      const safe = request.query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.name = { $regex: safe, $options: 'i' };
    }

    const [items, total] = await Promise.all([
      Item.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      Item.countDocuments(filter),
    ]);

    return reply.send({
      success: true,
      data: items,
      page,
      limit,
      total,
      hasMore: skip + items.length < total,
    });
  } catch (error) {
    logger.error('[items.controller] listItems error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};

export const getItemById = async (request, reply) => {
  try {
    const item = await Item.findById(request.params.id).lean();
    if (!item) {
      return reply.code(404).send({ success: false, error: 'Item not found' });
    }
    return reply.send({ success: true, data: item });
  } catch (error) {
    logger.error('[items.controller] getItemById error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};

export const createItem = async (request, reply) => {
  try {
    const item = await Item.create(request.body);
    return reply.code(201).send({ success: true, data: item });
  } catch (error) {
    if (error.code === 11000) {
      return reply.code(409).send({ success: false, error: 'Item with this name already exists' });
    }
    if (error.name === 'ValidationError') {
      return reply
        .code(400)
        .send({ success: false, error: 'Validation failed', details: error.errors });
    }
    logger.error('[items.controller] createItem error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};

export const updateItem = async (request, reply) => {
  try {
    const item = await Item.findByIdAndUpdate(
      request.params.id,
      { $set: request.body },
      { new: true, runValidators: true },
    ).lean();
    if (!item) {
      return reply.code(404).send({ success: false, error: 'Item not found' });
    }
    return reply.send({ success: true, data: item });
  } catch (error) {
    if (error.code === 11000) {
      return reply.code(409).send({ success: false, error: 'Item with this name already exists' });
    }
    if (error.name === 'ValidationError') {
      return reply
        .code(400)
        .send({ success: false, error: 'Validation failed', details: error.errors });
    }
    logger.error('[items.controller] updateItem error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};

export const deleteItem = async (request, reply) => {
  try {
    const item = await Item.findByIdAndDelete(request.params.id).lean();
    if (!item) {
      return reply.code(404).send({ success: false, error: 'Item not found' });
    }
    return reply.send({ success: true, data: { id: item._id } });
  } catch (error) {
    logger.error('[items.controller] deleteItem error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};
