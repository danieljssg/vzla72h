import logger from '../../config/logger.js';
import Inventory from '../../shared/models/Inventory.js';
import Item from '../../shared/models/Item.js';
import SupplyCenter from '../../shared/models/SupplyCenter.js';

export const listInventories = async (request, reply) => {
  try {
    const page = Math.max(parseInt(request.query.page, 10) || 1, 1);
    const rawLimit = parseInt(request.query.limit, 10) || 50;
    const limit = Math.min(Math.max(rawLimit, 1), 200);
    const skip = (page - 1) * limit;

    const filter = {};
    if (typeof request.query.supplyCenter === 'string' && request.query.supplyCenter.length > 0) {
      filter.supplyCenter = request.query.supplyCenter;
    }

    const [inventories, total] = await Promise.all([
      Inventory.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      Inventory.countDocuments(filter),
    ]);

    return reply.code(200).send({
      success: true,
      data: inventories,
      page,
      limit,
      total,
      hasMore: skip + inventories.length < total,
    });
  } catch (error) {
    logger.error('[inventory.controller] listInventories error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};

export const getInventoryById = async (request, reply) => {
  try {
    const inventory = await Inventory.findById(request.params.id)
      .populate('supplyCenter', 'name phone location')
      .populate('stocks.item', 'name category unit')
      .lean();
    if (!inventory) {
      return reply.code(404).send({ success: false, error: 'Inventory not found' });
    }
    return reply.code(200).send({ success: true, data: inventory });
  } catch (error) {
    if (error.name === 'CastError') {
      return reply.code(400).send({ success: false, error: 'Invalid ObjectId' });
    }
    logger.error('[inventory.controller] getInventoryById error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};

export const getInventoryBySupplyCenter = async (request, reply) => {
  try {
    const inventory = await Inventory.findOne({ supplyCenter: request.params.supplyCenterId })
      .populate('stocks.item', 'name category unit')
      .lean();
    if (!inventory) {
      return reply
        .code(404)
        .send({ success: false, error: 'No inventory for the given supply center' });
    }
    return reply.code(200).send({ success: true, data: inventory });
  } catch (error) {
    if (error.name === 'CastError') {
      return reply.code(400).send({ success: false, error: 'Invalid ObjectId' });
    }
    logger.error('[inventory.controller] getInventoryBySupplyCenter error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};

export const createInventory = async (request, reply) => {
  try {
    const { supplyCenter, stocks = [] } = request.body;

    const centerExists = await SupplyCenter.exists({ _id: supplyCenter });
    if (!centerExists) {
      return reply.code(404).send({ success: false, error: 'SupplyCenter not found' });
    }

    const inventory = await Inventory.create({ supplyCenter, stocks });
    return reply.code(201).send({ success: true, data: inventory });
  } catch (error) {
    if (error.code === 11000) {
      return reply
        .code(409)
        .send({ success: false, error: 'An inventory already exists for this supply center' });
    }
    if (error.name === 'ValidationError') {
      return reply
        .code(400)
        .send({ success: false, error: 'Validation failed', details: error.errors });
    }
    if (error.name === 'CastError') {
      return reply.code(400).send({ success: false, error: 'Invalid ObjectId' });
    }
    logger.error('[inventory.controller] createInventory error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};

export const updateInventory = async (request, reply) => {
  try {
    const { stocks } = request.body;
    if (stocks) {
      const itemIds = stocks.map((s) => s.item);
      const itemCount = await Item.countDocuments({ _id: { $in: itemIds } });
      if (itemCount !== itemIds.length) {
        return reply
          .code(400)
          .send({ success: false, error: 'One or more items do not exist in the catalog' });
      }
    }

    const inventory = await Inventory.findByIdAndUpdate(
      request.params.id,
      { $set: request.body },
      { new: true, runValidators: true },
    ).lean();
    if (!inventory) {
      return reply.code(404).send({ success: false, error: 'Inventory not found' });
    }
    return reply.code(200).send({ success: true, data: inventory });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return reply
        .code(400)
        .send({ success: false, error: 'Validation failed', details: error.errors });
    }
    if (error.name === 'CastError') {
      return reply.code(400).send({ success: false, error: 'Invalid ObjectId' });
    }
    logger.error('[inventory.controller] updateInventory error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};

export const adjustStock = async (request, reply) => {
  try {
    const { item, delta, reason } = request.body;

    const itemExists = await Item.exists({ _id: item });
    if (!itemExists) {
      return reply.code(404).send({ success: false, error: 'Item not found in catalog' });
    }

    const filter =
      delta >= 0
        ? { _id: request.params.id, 'stocks.item': item }
        : {
            _id: request.params.id,
            'stocks.item': item,
            'stocks.quantity': { $gte: Math.abs(delta) },
          };

    const updated = await Inventory.findOneAndUpdate(
      filter,
      { $inc: { 'stocks.$.quantity': delta } },
      { new: true, runValidators: true },
    ).lean();

    if (!updated) {
      if (delta < 0) {
        return reply
          .code(409)
          .send({ success: false, error: 'Insufficient stock for the requested decrement' });
      }
      const inventoryExists = await Inventory.exists({ _id: request.params.id });
      if (!inventoryExists) {
        return reply.code(404).send({ success: false, error: 'Inventory not found' });
      }
      const pushed = await Inventory.findByIdAndUpdate(
        request.params.id,
        { $push: { stocks: { item, quantity: delta } } },
        { new: true, runValidators: true },
      ).lean();
      logger.info(
        `[inventory.controller] adjustStock pushed new item ${item} qty=${delta} (reason: ${reason || 'n/a'})`,
      );
      return reply.code(200).send({ success: true, data: pushed });
    }

    logger.info(
      `[inventory.controller] adjustStock item ${item} delta=${delta} (reason: ${reason || 'n/a'})`,
    );
    return reply.code(200).send({ success: true, data: updated });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return reply
        .code(400)
        .send({ success: false, error: 'Validation failed', details: error.errors });
    }
    if (error.name === 'CastError') {
      return reply.code(400).send({ success: false, error: 'Invalid ObjectId' });
    }
    logger.error('[inventory.controller] adjustStock error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};

export const deleteInventory = async (request, reply) => {
  try {
    const inventory = await Inventory.findByIdAndDelete(request.params.id).lean();
    if (!inventory) {
      return reply.code(404).send({ success: false, error: 'Inventory not found' });
    }
    return reply.code(200).send({ success: true, data: { id: inventory._id } });
  } catch (error) {
    if (error.name === 'CastError') {
      return reply.code(400).send({ success: false, error: 'Invalid ObjectId' });
    }
    logger.error('[inventory.controller] deleteInventory error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};
