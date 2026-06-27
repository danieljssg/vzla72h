import logger from '../../config/logger.js';
import { addJob } from '../../jobs/queues/main.queue.js';
import Dispatch from '../../shared/models/Dispatch.js';
import Inventory from '../../shared/models/Inventory.js';
import Item from '../../shared/models/Item.js';
import SupplyCenter from '../../shared/models/SupplyCenter.js';

const PUBLIC_PROJECTION = {
  _id: 0,
  tripCode: 1,
  carrier: 1,
  origin: 1,
  originName: 1,
  destination: 1,
  loadedItems: 1,
  status: 1,
  dispatchedAt: 1,
  emptyPhotoUrl: 1,
  loadedPhotoUrl: 1,
};

const stripBase64Prefix = (raw) => {
  if (typeof raw !== 'string' || raw.length === 0) {
    return raw;
  }
  const match = raw.match(/^data:[^;]+;base64,/);
  return match ? raw.slice(match[0].length) : raw;
};

const ensureString = (value, field) => {
  if (typeof value !== 'string' || value.trim() === '') {
    const err = new Error(`Field "${field}" must be a non-empty string`);
    err.statusCode = 400;
    throw err;
  }
  return value.trim();
};

const ensurePositiveNumber = (value, field) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    const err = new Error(`Field "${field}" must be a positive number`);
    err.statusCode = 400;
    throw err;
  }
  return num;
};

export const createDispatch = async (request, reply) => {
  try {
    const body = request.body || {};

    const licensePlate = ensureString(body.licensePlate, 'licensePlate').toUpperCase();
    const driverName = ensureString(body.driverName, 'driverName');
    const driverPhone = ensureString(body.driverPhone, 'driverPhone');
    const origin = ensureString(body.origin, 'origin');
    const originName = ensureString(body.originName, 'originName');
    const emptyPhotoBase64 = body.emptyPhotoBase64;

    if (typeof emptyPhotoBase64 !== 'string' || emptyPhotoBase64.length === 0) {
      return reply.code(400).send({ success: false, error: 'emptyPhotoBase64 is required' });
    }

    if (!Array.isArray(body.loadedItems) || body.loadedItems.length === 0) {
      return reply
        .code(400)
        .send({ success: false, error: 'loadedItems must be a non-empty array' });
    }

    if (!body.destination || typeof body.destination !== 'object') {
      return reply.code(400).send({ success: false, error: 'destination is required' });
    }

    const destination = {
      state: ensureString(body.destination.state, 'destination.state'),
      city: ensureString(body.destination.city, 'destination.city'),
      parish: ensureString(body.destination.parish, 'destination.parish'),
      specificLocation: ensureString(
        body.destination.specificLocation,
        'destination.specificLocation',
      ),
    };

    const itemsInput = body.loadedItems.map((entry, idx) => ({
      index: idx,
      itemName: ensureString(entry.itemName, `loadedItems[${idx}].itemName`),
      quantity: ensurePositiveNumber(entry.quantity, `loadedItems[${idx}].quantity`),
      unit: ensureString(entry.unit || 'boxes', `loadedItems[${idx}].unit`),
    }));

    const centerExists = await SupplyCenter.exists({ _id: origin });
    if (!centerExists) {
      return reply.code(404).send({ success: false, error: 'SupplyCenter not found' });
    }

    const itemNames = itemsInput.map((i) => i.itemName);
    const itemDocs = await Item.find({ name: { $in: itemNames } })
      .select('_id name unit')
      .lean();
    const itemByName = new Map(itemDocs.map((doc) => [doc.name, doc]));

    for (const entry of itemsInput) {
      if (!itemByName.has(entry.itemName)) {
        return reply
          .code(400)
          .send({ success: false, error: `Item "${entry.itemName}" not found in catalog` });
      }
    }

    const inventory = await Inventory.findOne({ supplyCenter: origin });
    if (!inventory) {
      return reply
        .code(404)
        .send({ success: false, error: 'No inventory record for the given supply center' });
    }

    const stockByItemId = new Map(
      (inventory.stocks || []).map((s) => [s.item.toString(), s.quantity]),
    );

    for (const entry of itemsInput) {
      const itemId = itemByName.get(entry.itemName)._id.toString();
      const available = stockByItemId.get(itemId) ?? 0;
      if (available < entry.quantity) {
        return reply.code(409).send({
          success: false,
          error: `Insufficient stock for "${entry.itemName}" (available: ${available}, requested: ${entry.quantity})`,
        });
      }
    }

    const appliedDeductions = [];
    try {
      for (const entry of itemsInput) {
        const itemDoc = itemByName.get(entry.itemName);
        const updated = await Inventory.findOneAndUpdate(
          {
            supplyCenter: origin,
            'stocks.item': itemDoc._id,
            'stocks.quantity': { $gte: entry.quantity },
          },
          { $inc: { 'stocks.$.quantity': -entry.quantity } },
          { new: true },
        ).lean();

        if (!updated) {
          throw Object.assign(new Error('INSUFFICIENT_STOCK_RACE'), { entry });
        }
        appliedDeductions.push({ itemId: itemDoc._id, quantity: entry.quantity });
      }
    } catch (rollbackErr) {
      for (const applied of appliedDeductions) {
        await Inventory.findOneAndUpdate(
          { supplyCenter: origin, 'stocks.item': applied.itemId },
          { $inc: { 'stocks.$.quantity': applied.quantity } },
        ).catch((err) =>
          logger.error(
            `[dispatch.controller] Compensation failed for item ${applied.itemId}: ${err.message}`,
          ),
        );
      }

      if (rollbackErr.message === 'INSUFFICIENT_STOCK_RACE') {
        return reply.code(409).send({
          success: false,
          error: `Insufficient stock for "${rollbackErr.entry.itemName}" (concurrent update)`,
        });
      }
      throw rollbackErr;
    }

    const loadedItemsEmbedded = itemsInput.map((entry) => {
      const itemDoc = itemByName.get(entry.itemName);
      return {
        itemName: itemDoc.name,
        quantity: entry.quantity,
        unit: itemDoc.unit || entry.unit,
      };
    });

    const dispatch = await Dispatch.create({
      carrier: { licensePlate, driverName, driverPhone },
      origin,
      originName,
      destination,
      loadedItems: loadedItemsEmbedded,
      status: 'in_transit',
    });

    await addJob('PROCESS_CARRIER_PHOTO', {
      dispatchId: dispatch._id.toString(),
      licensePlate,
      emptyPhotoBase64: stripBase64Prefix(emptyPhotoBase64),
    });

    return reply.code(201).send({
      success: true,
      data: {
        dispatchId: dispatch._id,
        tripCode: dispatch.tripCode,
        status: dispatch.status,
        dispatchedAt: dispatch.dispatchedAt,
      },
    });
  } catch (error) {
    if (error.statusCode === 400) {
      return reply.code(400).send({ success: false, error: error.message });
    }
    logger.error('[dispatch.controller] createDispatch error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};

export const getPublicDispatches = async (request, reply) => {
  try {
    const page = Math.max(parseInt(request.query.page, 10) || 1, 1);
    const rawLimit = parseInt(request.query.limit, 10) || 20;
    const limit = Math.min(Math.max(rawLimit, 1), 50);
    const skip = (page - 1) * limit;

    const status = typeof request.query.status === 'string' ? request.query.status : null;

    const filter = {};
    if (status) {
      filter.status = status;
    }

    const [items, total] = await Promise.all([
      Dispatch.find(filter, PUBLIC_PROJECTION)
        .sort({ dispatchedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Dispatch.countDocuments(filter),
    ]);

    return reply.code(200).send({
      success: true,
      data: items,
      page,
      limit,
      total,
      hasMore: skip + items.length < total,
    });
  } catch (error) {
    logger.error('[dispatch.controller] getPublicDispatches error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};

export const getDispatchByPlateOrCode = async (request, reply) => {
  try {
    const rawQuery = typeof request.query.q === 'string' ? request.query.q.trim() : '';
    if (rawQuery.length === 0) {
      return reply.code(400).send({ success: false, error: 'Query param "q" is required' });
    }

    const normalized = rawQuery.toUpperCase();

    const dispatch = await Dispatch.findOne(
      { $or: [{ tripCode: normalized }, { 'carrier.licensePlate': normalized }] },
      PUBLIC_PROJECTION,
    )
      .sort({ dispatchedAt: -1 })
      .lean();

    if (!dispatch) {
      return reply.code(404).send({ success: false, error: 'Dispatch not found' });
    }

    return reply.code(200).send({ success: true, data: dispatch });
  } catch (error) {
    logger.error('[dispatch.controller] getDispatchByPlateOrCode error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};
