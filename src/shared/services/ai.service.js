import logger from '../../config/logger.js';
import { buildPrompt } from '../../utils/aiPromptBuilder.js';
import { runWithFallback } from '../../utils/modelsPool.js';

export const analyzeResume = async (cvText, hobby = '', candidateName = '') => {
  const prompt = buildPrompt(cvText, hobby, candidateName);
  logger.info('[ai.service] Generando análisis');
  return runWithFallback(prompt, logger);
};
