import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import logger from '../../config/logger.js';
import EmergencyNeed from '../../shared/models/EmergencyNeed.js';

const AUDIO_STORAGE_DIR = '/app/storage/requests';
const ALLOWED_AUDIO_EXT = new Set(['.mp3', '.ogg', '.wav', '.m4a', '.webm', '.opus', '.mp4']);

const sanitizeExtension = (originalName, mimetype) => {
  const ext = extname(originalName || '').toLowerCase();
  if (ALLOWED_AUDIO_EXT.has(ext)) return ext;
  if (mimetype === 'audio/mpeg') return '.mp3';
  if (mimetype === 'audio/ogg') return '.ogg';
  if (mimetype === 'audio/wav' || mimetype === 'audio/x-wav') return '.wav';
  if (mimetype === 'audio/mp4' || mimetype === 'audio/aac') return '.m4a';
  if (mimetype === 'audio/webm') return '.webm';
  return '.ogg';
};

export const createEmergencyNeed = async (req, res) => {
  try {
    const { zone, category, description, reportedBy } = req.body;
    let audioPath = null;

    if (req.file) {
      await mkdir(AUDIO_STORAGE_DIR, { recursive: true });
      const ext = sanitizeExtension(req.file.originalname, req.file.mimetype);
      const fileName = `need_${Date.now()}_${randomUUID()}${ext}`;
      const fullPath = join(AUDIO_STORAGE_DIR, fileName);
      await writeFile(fullPath, req.file.buffer);
      audioPath = `/uploads/requests/${fileName}`;
    }

    const newNeed = await EmergencyNeed.create({
      zone,
      category,
      description: description || '',
      reportedBy,
      audioPath,
    });

    return res.status(201).json({
      success: true,
      data: newNeed,
      message: 'Emergency need registered successfully',
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res
        .status(400)
        .json({ success: false, error: 'Validation failed', details: error.errors });
    }
    logger.error('[needs.controller] createEmergencyNeed error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const listEmergencyNeeds = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const rawLimit = parseInt(req.query.limit, 10) || 50;
    const limit = Math.min(Math.max(rawLimit, 1), 200);
    const skip = (page - 1) * limit;

    const filter = {};
    if (typeof req.query.category === 'string' && req.query.category.length > 0) {
      filter.category = req.query.category;
    }
    if (req.query.isResolved !== undefined) {
      filter.isResolved = req.query.isResolved === 'true';
    } else {
      filter.isResolved = false;
    }
    if (typeof req.query.zone === 'string' && req.query.zone.trim().length > 0) {
      const safe = req.query.zone.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.zone = { $regex: safe, $options: 'i' };
    }

    const [needs, total] = await Promise.all([
      EmergencyNeed.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      EmergencyNeed.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: needs,
      page,
      limit,
      total,
      hasMore: skip + needs.length < total,
    });
  } catch (error) {
    logger.error('[needs.controller] listEmergencyNeeds error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getActiveNeeds = async (_req, res) => {
  try {
    const needs = await EmergencyNeed.find({ isResolved: false }).sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      data: needs,
      count: needs.length,
    });
  } catch (error) {
    logger.error('[needs.controller] getActiveNeeds error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getEmergencyNeedById = async (req, res) => {
  try {
    const need = await EmergencyNeed.findById(req.params.id).lean();
    if (!need) {
      return res.status(404).json({ success: false, error: 'EmergencyNeed not found' });
    }
    return res.status(200).json({ success: true, data: need });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, error: 'Invalid ObjectId' });
    }
    logger.error('[needs.controller] getEmergencyNeedById error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateEmergencyNeed = async (req, res) => {
  try {
    const need = await EmergencyNeed.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true },
    ).lean();
    if (!need) {
      return res.status(404).json({ success: false, error: 'EmergencyNeed not found' });
    }
    return res.status(200).json({ success: true, data: need });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res
        .status(400)
        .json({ success: false, error: 'Validation failed', details: error.errors });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, error: 'Invalid ObjectId' });
    }
    logger.error('[needs.controller] updateEmergencyNeed error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const resolveEmergencyNeed = async (req, res) => {
  try {
    const need = await EmergencyNeed.findByIdAndUpdate(
      req.params.id,
      { $set: { isResolved: true } },
      { new: true },
    ).lean();
    if (!need) {
      return res.status(404).json({ success: false, error: 'EmergencyNeed not found' });
    }
    return res.status(200).json({ success: true, data: need });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, error: 'Invalid ObjectId' });
    }
    logger.error('[needs.controller] resolveEmergencyNeed error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteEmergencyNeed = async (req, res) => {
  try {
    const need = await EmergencyNeed.findByIdAndDelete(req.params.id).lean();
    if (!need) {
      return res.status(404).json({ success: false, error: 'EmergencyNeed not found' });
    }
    return res.status(200).json({ success: true, data: { id: need._id } });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, error: 'Invalid ObjectId' });
    }
    logger.error('[needs.controller] deleteEmergencyNeed error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
