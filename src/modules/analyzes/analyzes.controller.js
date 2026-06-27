import logger from '../../config/logger.js';
import { addJobAnalysis, addJobAudio } from '../../jobs/queues/main.queue.js';
import Analysis from '../../shared/models/Analysis.js';
import AnalysisAudio from '../../shared/models/AnalysisAudio.js';
import Job from '../../shared/models/Job.js';
import { analyzeSchema } from '../../utils/validations/schemas/analyzeSchema.js';

export const submitAnalysis = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Se requiere un archivo PDF' });
    }
    const parsed = analyzeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.flatten().fieldErrors });
    }
    const { candidateName, hobby } = parsed.data;
    const job = await Job.create({
      userId: req.user.id,
      createdBy: req.user.id,
      candidateName,
      hobby,
      status: 'pending',
      progress: { percentage: 0, step: 'En cola' },
    });
    await addJobAnalysis('ANALYZE_CV', {
      jobId: job._id.toString(),
      pdfBuffer: req.file.buffer.toString('base64'),
      candidateName,
      hobby,
    });
    return res.status(201).json({
      success: true,
      jobId: job._id,
      status: 'pending',
      progress: job.progress,
      message: 'Tu CV está siendo analizado',
    });
  } catch (error) {
    logger.error('[analyze.controller] submitAnalysis error:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

export const getAnalysisById = async (req, res) => {
  try {
    const analysis = await Analysis.findOne({
      _id: req.params.analysisId,
      createdBy: req.user.id,
    }).lean();
    if (!analysis) {
      return res.status(404).json({ success: false, error: 'Análisis no encontrado' });
    }
    return res.status(200).json({ success: true, data: analysis });
  } catch (error) {
    logger.error('[analyze.controller] getAnalysisById error:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

export const getMyAnalyses = async (req, res) => {
  try {
    const full = req.query.full === 'true';
    const query = Analysis.find({ createdBy: req.user.id }).sort({ createdAt: -1 }).limit(20);
    if (!full) {
      query.select('_id candidateData functionalArea occupation createdAt');
    }
    const analyses = await query.lean();
    return res.status(200).json({ success: true, data: analyses, count: analyses.length, full });
  } catch (error) {
    logger.error('[analyze.controller] getMyAnalyses error:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

export const generateTTS = async (req, res) => {
  try {
    const { analysisId } = req.params;
    const analysis = await Analysis.findOne({
      _id: analysisId,
      createdBy: req.user.id,
    }).lean();

    if (!analysis) {
      return res.status(404).json({ success: false, error: 'Análisis no encontrado' });
    }

    if (!analysis.ai_insight || analysis.ai_insight === 'N/A') {
      return res
        .status(400)
        .json({ success: false, error: 'El análisis no tiene contenido de IA generado' });
    }

    const existingAudio = await AnalysisAudio.findOne({ analysisId }).lean();
    if (existingAudio) {
      return res.status(200).json({
        success: true,
        message: 'El audio ya existe o está en proceso',
        data: existingAudio,
      });
    }

    await addJobAudio('GENERATE_TTS', { analysisId });

    return res.status(200).json({
      success: true,
      message: 'La generación de audio ha comenzado',
    });
  } catch (error) {
    logger.error('[analyze.controller] generateTTS error:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

export const getAudioTTS = async (req, res) => {
  try {
    const { analysisId } = req.params;
    const audio = await AnalysisAudio.findOne({ analysisId }).lean();
    if (!audio) {
      return res.status(404).json({ success: false, error: 'Audio no encontrado' });
    }
    return res.status(200).json({ success: true, data: audio });
  } catch (error) {
    logger.error('[analyze.controller] getAudio error:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};
