import logger from '../../config/logger.js';
import Inventory from '../../shared/models/Inventory.js';
import Item from '../../shared/models/Item.js';
import SupplyCenter from '../../shared/models/SupplyCenter.js';
import { fromGeoPoint, parseNearQuery, toGeoPoint } from '../../utils/geo.js';

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

// Flatten the { photo: { data, mimeType } } object into the model's two
// separate string fields. Accepts a data URL prefix and strips it.
const extractPhoto = (photo) => {
  if (!photo || !photo.data) return { photo: null, photoMimeType: null };
  const dataUrlMatch = /^data:([^;]+);base64,(.+)$/.exec(photo.data);
  if (dataUrlMatch) {
    return { photo: dataUrlMatch[2], photoMimeType: dataUrlMatch[1] };
  }
  return { photo: photo.data, photoMimeType: photo.mimeType ?? null };
};

// Convert { lat, lng } from the request body into the GeoJSON Point
// format required by MongoDB's 2dsphere index:
//   { type: 'Point', coordinates: [lng, lat] }
const toGeoJsonPoint = ({ lat, lng }) => {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { type: 'Point', coordinates: [lng, lat] };
};

const buildLocationPayload = (location) => {
  const point = toGeoJsonPoint(location.coordinates || {});
  if (!point) {
    return { error: 'Invalid location coordinates (lat must be -90..90, lng -180..180)' };
  }
  return {
    location: {
      state: location.state,
      city: location.city,
      parish: location.parish,
      address: location.address,
      coordinates: point,
    },
  };
};

export const createSupplyCenter = async (request, reply) => {
  try {
    const { photo, location, ...rest } = request.body;
    const built = buildLocationPayload(location);
    if (built.error) {
      return reply.code(400).send({ success: false, error: built.error });
    }
    const photoFields = extractPhoto(photo);
    const center = await SupplyCenter.create({ ...rest, ...built, ...photoFields });
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
    logger.error({ err: error, body: request.body }, '[supply-centers] createSupplyCenter error');
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};

export const updateSupplyCenter = async (request, reply) => {
  try {
    const { photo, location, ...rest } = request.body;
    const update = { ...rest };
    if (location) {
      const built = buildLocationPayload(location);
      if (built.error) {
        return reply.code(400).send({ success: false, error: built.error });
      }
      update.location = built.location;
    }
    if (photo !== undefined) {
      const photoFields = extractPhoto(photo);
      update.photo = photoFields.photo;
      update.photoMimeType = photoFields.photoMimeType;
    }
    const center = await SupplyCenter.findByIdAndUpdate(
      request.params.id,
      { $set: update },
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

/* ========================================================================
   Búsqueda por cercanía + búsqueda de items
   ======================================================================== */

/**
 * GET /api/supply-centers/near?lat=X&lng=Y&maxDistance=5000
 * Devuelve centros ordenados del más cercano al más lejano.
 */
export const nearSupplyCenters = async (request, reply) => {
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

    const results = await SupplyCenter.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [coords.lng, coords.lat] },
          distanceField: 'distanceMeters',
          maxDistance: coords.maxDistance,
          spherical: true,
          query: { isActive: true },
        },
      },
      { $limit: limit },
    ]);

    return reply.code(200).send({
      success: true,
      data: results.map((r) => ({
        ...r,
        location: {
          ...r.location,
          lat: fromGeoPoint(r.location)?.lat,
          lng: fromGeoPoint(r.location)?.lng,
        },
      })),
      origin: { lat: coords.lat, lng: coords.lng },
      maxDistance: coords.maxDistance,
      count: results.length,
    });
  } catch (error) {
    logger.error('[supply-centers.controller] nearSupplyCenters error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};

/**
 * GET /api/supply-centers/search?q=alginato&lat=X&lng=Y
 * Busca items por nombre, encuentra los inventarios que los contienen
 * y devuelve los centros ordenados del más cercano al más lejano
 * (si se proporcionó lat/lng).
 */
export const searchSupplyCentersByItem = async (request, reply) => {
  try {
    const q = typeof request.query.q === 'string' ? request.query.q.trim() : '';
    if (q.length < 2) {
      return reply.code(400).send({ success: false, error: 'Query "q" must be at least 2 chars' });
    }

    const limit = Math.min(Math.max(parseInt(request.query.limit, 10) || 50, 1), 200);

    // 1) Buscar items que coincidan
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const items = await Item.find({
      $or: [
        { name: { $regex: safe, $options: 'i' } },
        { category: { $regex: safe, $options: 'i' } },
      ],
    })
      .select('_id name category unit')
      .lean();
    const itemIds = items.map((it) => it._id);

    if (itemIds.length === 0) {
      return reply.code(200).send({ success: true, data: [], query: q, count: 0 });
    }

    // 2) Encontrar inventarios con esos items
    const inventories = await Inventory.find({ 'stocks.item': { $in: itemIds } })
      .select('supplyCenter stocks')
      .lean();
    const centerIds = [...new Set(inventories.map((inv) => String(inv.supplyCenter)))];

    if (centerIds.length === 0) {
      return reply.code(200).send({ success: true, data: [], query: q, count: 0 });
    }

    // 3) Traer los centros
    const itemIdSet = new Set(itemIds.map((id) => String(id)));
    const centerBySupplyCenter = new Map(inventories.map((inv) => [String(inv.supplyCenter), inv]));

    let centerQuery = SupplyCenter.find({ _id: { $in: centerIds }, isActive: true });
    let near = null;
    try {
      near = parseNearQuery(request.query);
    } catch (e) {
      return reply.code(400).send({ success: false, error: e.message });
    }

    let centers = await centerQuery.lean();
    centers = centers.map((c) => {
      const inv = centerBySupplyCenter.get(String(c._id));
      const matchedStocks = (inv?.stocks || []).filter((s) => itemIdSet.has(String(s.item)));
      const matchedItems = matchedStocks
        .map((s) => items.find((it) => String(it._id) === String(s.item)))
        .filter(Boolean);
      return { ...c, matchedStocks, matchedItems };
    });

    // 4) Ordenar por distancia si hay coords
    if (near) {
      centers = centers
        .map((c) => {
          const geo = fromGeoPoint(c.location);
          if (!geo) return { ...c, distanceMeters: null };
          const dLat = (geo.lat - near.lat) * 111000;
          const dLng = (geo.lng - near.lng) * 111000 * Math.cos((near.lat * Math.PI) / 180);
          const dist = Math.sqrt(dLat * dLat + dLng * dLng);
          return { ...c, distanceMeters: Math.round(dist) };
        })
        .sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity));
    } else {
      centers.sort((a, b) => a.name.localeCompare(b.name));
    }

    centers = centers.slice(0, limit);

    return reply.code(200).send({
      success: true,
      data: centers,
      query: q,
      origin: near ? { lat: near.lat, lng: near.lng } : null,
      count: centers.length,
    });
  } catch (error) {
    logger.error('[supply-centers.controller] searchSupplyCentersByItem error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};
