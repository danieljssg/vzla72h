import logger from '../../config/logger.js';
import Inventory from '../../shared/models/Inventory.js';
import Item from '../../shared/models/Item.js';
import SupplyCenter from '../../shared/models/SupplyCenter.js';

export const listInventories = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const rawLimit = parseInt(req.query.limit, 10) || 50;
    const limit = Math.min(Math.max(rawLimit, 1), 200);
    const skip = (page - 1) * limit;

    const filter = {};
    if (typeof req.query.supplyCenter === 'string' && req.query.supplyCenter.length > 0) {
      filter.supplyCenter = req.query.supplyCenter;
    }

    const [inventories, total] = await Promise.all([
      Inventory.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      Inventory.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: inventories,
      page,
      limit,
      total,
      hasMore: skip + inventories.length < total,
    });
  } catch (error) {
    logger.error('[inventory.controller] listInventories error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getInventoryById = async (req, res) => {
  try {
    const inventory = await Inventory.findById(req.params.id)
      .populate('supplyCenter', 'name phone location')
      .populate('stocks.item', 'name category unit')
      .lean();
    if (!inventory) {
      return res.status(404).json({ success: false, error: 'Inventory not found' });
    }
    return res.status(200).json({ success: true, data: inventory });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, error: 'Invalid ObjectId' });
    }
    logger.error('[inventory.controller] getInventoryById error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getInventoryBySupplyCenter = async (req, res) => {
  try {
    const inventory = await Inventory.findOne({ supplyCenter: req.params.supplyCenterId })
      .populate('stocks.item', 'name category unit')
      .lean();
    if (!inventory) {
      return res
        .status(404)
        .json({ success: false, error: 'No inventory for the given supply center' });
    }
    return res.status(200).json({ success: true, data: inventory });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, error: 'Invalid ObjectId' });
    }
    logger.error('[inventory.controller] getInventoryBySupplyCenter error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createInventory = async (req, res) => {
  try {
    const { supplyCenter, stocks = [] } = req.body;

    const centerExists = await SupplyCenter.exists({ _id: supplyCenter });
    if (!centerExists) {
      return res.status(404).json({ success: false, error: 'SupplyCenter not found' });
    }

    const inventory = await Inventory.create({ supplyCenter, stocks });
    return res.status(201).json({ success: true, data: inventory });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ success: false, error: 'An inventory already exists for this supply center' });
    }
    if (error.name === 'ValidationError') {
      return res
        .status(400)
        .json({ success: false, error: 'Validation failed', details: error.errors });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, error: 'Invalid ObjectId' });
    }
    logger.error('[inventory.controller] createInventory error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateInventory = async (req, res) => {
  try {
    const { stocks } = req.body;
    if (stocks) {
      const itemIds = stocks.map((s) => s.item);
      const itemCount = await Item.countDocuments({ _id: { $in: itemIds } });
      if (itemCount !== itemIds.length) {
        return res
          .status(400)
          .json({ success: false, error: 'One or more items do not exist in the catalog' });
      }
    }

    const inventory = await Inventory.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true },
    ).lean();
    if (!inventory) {
      return res.status(404).json({ success: false, error: 'Inventory not found' });
    }
    return res.status(200).json({ success: true, data: inventory });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res
        .status(400)
        .json({ success: false, error: 'Validation failed', details: error.errors });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, error: 'Invalid ObjectId' });
    }
    logger.error('[inventory.controller] updateInventory error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const adjustStock = async (req, res) => {
  try {
    const { item, delta, reason } = req.body;

    const itemExists = await Item.exists({ _id: item });
    if (!itemExists) {
      return res.status(404).json({ success: false, error: 'Item not found in catalog' });
    }

    const filter =
      delta >= 0
        ? { _id: req.params.id, 'stocks.item': item }
        : { _id: req.params.id, 'stocks.item': item, 'stocks.quantity': { $gte: Math.abs(delta) } };

    const updated = await Inventory.findOneAndUpdate(
      filter,
      { $inc: { 'stocks.$.quantity': delta } },
      { new: true, runValidators: true },
    ).lean();

    if (!updated) {
      if (delta < 0) {
        return res
          .status(409)
          .json({ success: false, error: 'Insufficient stock for the requested decrement' });
      }
      const inventoryExists = await Inventory.exists({ _id: req.params.id });
      if (!inventoryExists) {
        return res.status(404).json({ success: false, error: 'Inventory not found' });
      }
      const pushed = await Inventory.findByIdAndUpdate(
        req.params.id,
        { $push: { stocks: { item, quantity: delta } } },
        { new: true, runValidators: true },
      ).lean();
      logger.info(
        `[inventory.controller] adjustStock pushed new item ${item} qty=${delta} (reason: ${reason || 'n/a'})`,
      );
      return res.status(200).json({ success: true, data: pushed });
    }

    logger.info(
      `[inventory.controller] adjustStock item ${item} delta=${delta} (reason: ${reason || 'n/a'})`,
    );
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res
        .status(400)
        .json({ success: false, error: 'Validation failed', details: error.errors });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, error: 'Invalid ObjectId' });
    }
    logger.error('[inventory.controller] adjustStock error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteInventory = async (req, res) => {
  try {
    const inventory = await Inventory.findByIdAndDelete(req.params.id).lean();
    if (!inventory) {
      return res.status(404).json({ success: false, error: 'Inventory not found' });
    }
    return res.status(200).json({ success: true, data: { id: inventory._id } });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, error: 'Invalid ObjectId' });
    }
    logger.error('[inventory.controller] deleteInventory error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
