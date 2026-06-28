import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import logger from '../../config/logger.js';
import EmergencyNeed from '../../shared/models/EmergencyNeed.js';
import { parseNearQuery, toGeoPoint } from '../../utils/geo.js';

const AUDIO_STORAGE_DIR = '/app/storage/requests';
const ALLOWED_AUDIO_EXT = new Set(['.mp3', '.ogg', '.wav', '.m4a', '.webm', '.opus', '.mp4']);

const sanitizeExtension = (originalName, mimetype) => {
  const ext = extname(originalName || '').toLowerCase();
  if (ALLOWED_AUDIO_EXT.has(ext)) {
    return ext;
  }
  if (mimetype === 'audio/mpeg') {
    return '.mp3';
  }
  if (mimetype === 'audio/ogg') {
    return '.ogg';
  }
  if (mimetype === 'audio/wav' || mimetype === 'audio/x-wav') {
    return '.wav';
  }
  if (mimetype === 'audio/mp4' || mimetype === 'audio/aac') {
    return '.m4a';
  }
  if (mimetype === 'audio/webm') {
    return '.webm';
  }
  return '.ogg';
};

// Read the pre-collected audio file (parsed by parseMultipartFields preHandler).
const readAudioFile = (request) => {
  const files = request._multipartFiles;
  if (!files || files.length === 0) {
    return null;
  }

  const audio = files.find((f) => f.fieldname === 'audio');
  if (!audio) {
    return null;
  }

  return {
    buffer: audio.buffer,
    mimetype: audio.mimetype,
    originalname: audio.filename,
  };
};

export const createEmergencyNeed = async (request, reply) => {
  try {
    const { zone, category, urgency, description, reportedBy, lat, lng } = request.body;
    let audioPath = null;

    const audio = readAudioFile(request);
    if (audio) {
      await mkdir(AUDIO_STORAGE_DIR, { recursive: true });
      const ext = sanitizeExtension(audio.originalname, audio.mimetype);
      const fileName = `need_${Date.now()}_${randomUUID()}${ext}`;
      const fullPath = join(AUDIO_STORAGE_DIR, fileName);
      await writeFile(fullPath, audio.buffer);
      audioPath = `/uploads/requests/${fileName}`;
    }

    let location;
    if (lat !== undefined || lng !== undefined) {
      location = toGeoPoint({ lat, lng });
      if (!location) {
        return reply.code(400).send({ success: false, error: 'Invalid lat/lng' });
      }
    }

    const newNeed = await EmergencyNeed.create({
      zone,
      category,
      urgency,
      description: description || '',
      reportedBy,
      audioPath,
      ...(location ? { location } : {}),
    });

    return reply.code(201).send({
      success: true,
      data: newNeed,
      message: 'Emergency need registered successfully',
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return reply
        .code(400)
        .send({ success: false, error: 'Validation failed', details: error.errors });
    }
    logger.error('[needs.controller] createEmergencyNeed error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};

export const listEmergencyNeeds = async (request, reply) => {
  try {
    const page = Math.max(parseInt(request.query.page, 10) || 1, 1);
    const rawLimit = parseInt(request.query.limit, 10) || 50;
    const limit = Math.min(Math.max(rawLimit, 1), 200);
    const skip = (page - 1) * limit;

    const filter = {};
    if (typeof request.query.category === 'string' && request.query.category.length > 0) {
      filter.category = request.query.category;
    }
    if (typeof request.query.urgency === 'string' && request.query.urgency.length > 0) {
      filter.urgency = request.query.urgency;
    }
    if (request.query.isResolved !== undefined) {
      filter.isResolved = request.query.isResolved === 'true';
    } else {
      filter.isResolved = false;
    }
    if (typeof request.query.zone === 'string' && request.query.zone.trim().length > 0) {
      const safe = request.query.zone.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.zone = { $regex: safe, $options: 'i' };
    }

    const [needs, total] = await Promise.all([
      EmergencyNeed.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      EmergencyNeed.countDocuments(filter),
    ]);

    return reply.code(200).send({
      success: true,
      data: needs,
      page,
      limit,
      total,
      hasMore: skip + needs.length < total,
    });
  } catch (error) {
    logger.error('[needs.controller] listEmergencyNeeds error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};

export const getActiveNeeds = async (_request, reply) => {
  try {
    const needs = await EmergencyNeed.find({ isResolved: false }).sort({ createdAt: -1 }).lean();

    return reply.code(200).send({
      success: true,
      data: needs,
      count: needs.length,
    });
  } catch (error) {
    logger.error('[needs.controller] getActiveNeeds error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};

export const getEmergencyNeedById = async (request, reply) => {
  try {
    const need = await EmergencyNeed.findById(request.params.id).lean();
    if (!need) {
      return reply.code(404).send({ success: false, error: 'EmergencyNeed not found' });
    }
    return reply.code(200).send({ success: true, data: need });
  } catch (error) {
    if (error.name === 'CastError') {
      return reply.code(400).send({ success: false, error: 'Invalid ObjectId' });
    }
    logger.error('[needs.controller] getEmergencyNeedById error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};

export const updateEmergencyNeed = async (request, reply) => {
  try {
    const update = { ...request.body };
    if (update.lat !== undefined || update.lng !== undefined) {
      const point = toGeoPoint({ lat: update.lat, lng: update.lng });
      if (point) update.location = point;
      delete update.lat;
      delete update.lng;
    }
    const need = await EmergencyNeed.findByIdAndUpdate(
      request.params.id,
      { $set: update },
      { new: true, runValidators: true },
    ).lean();
    if (!need) {
      return reply.code(404).send({ success: false, error: 'EmergencyNeed not found' });
    }
    return reply.code(200).send({ success: true, data: need });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return reply
        .code(400)
        .send({ success: false, error: 'Validation failed', details: error.errors });
    }
    if (error.name === 'CastError') {
      return reply.code(400).send({ success: false, error: 'Invalid ObjectId' });
    }
    logger.error('[needs.controller] updateEmergencyNeed error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};

export const resolveEmergencyNeed = async (request, reply) => {
  try {
    const need = await EmergencyNeed.findByIdAndUpdate(
      request.params.id,
      { $set: { isResolved: true } },
      { new: true },
    ).lean();
    if (!need) {
      return reply.code(404).send({ success: false, error: 'EmergencyNeed not found' });
    }
    return reply.code(200).send({ success: true, data: need });
  } catch (error) {
    if (error.name === 'CastError') {
      return reply.code(400).send({ success: false, error: 'Invalid ObjectId' });
    }
    logger.error('[needs.controller] resolveEmergencyNeed error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};

export const deleteEmergencyNeed = async (request, reply) => {
  try {
    const need = await EmergencyNeed.findByIdAndDelete(request.params.id).lean();
    if (!need) {
      return reply.code(404).send({ success: false, error: 'EmergencyNeed not found' });
    }
    return reply.code(200).send({ success: true, data: { id: need._id } });
  } catch (error) {
    if (error.name === 'CastError') {
      return reply.code(400).send({ success: false, error: 'Invalid ObjectId' });
    }
    logger.error('[needs.controller] deleteEmergencyNeed error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};

/**
 * GET /api/emergency-needs/near?lat=X&lng=Y&maxDistance=5000
 * Devuelve necesidades activas ordenadas del más cercano al más lejano.
 */
export const nearEmergencyNeeds = async (request, reply) => {
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

    const results = await EmergencyNeed.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [coords.lng, coords.lat] },
          distanceField: 'distanceMeters',
          maxDistance: coords.maxDistance,
          spherical: true,
          query: { isResolved: false },
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
    logger.error('[needs.controller] nearEmergencyNeeds error:', error);
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  }
};
