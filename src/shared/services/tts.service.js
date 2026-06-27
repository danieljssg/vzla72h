import logger from '../../config/logger.js';
import { normalizeTTS } from '../../utils/ttsDictionary.js';

const TTS_URL = `${process.env.TTS_PROVIDER}/v1/audio/speech`;

export const generateSpeech = async (text) => {
  const normalizedText = await normalizeTTS(text);
  logger.info(`[tts.service] Generando audio (${normalizedText.length} caracteres)`);

  const response = await fetch(TTS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'kokoro',
      input: normalizedText,
      voice: 'ef_dora',
      speed: 1.15,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Kokoro-TTS ${response.status}: ${err}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};
