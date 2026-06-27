import logger from '../../config/logger.js';
// import Tesseract from 'tesseract.js';

export const performOCR = async (pdfBuffer) => {
  // return "Texto extraído vía OCR: Juan Pérez, Desarrollador Fullstack...";

  // --- IMPLEMENTACIÓN REAL (Simplificada) ---
  try {
    // Nota: Tesseract.js en Node prefiere imágenes (PNG/JPG).
    // Aquí idealmente convertirías la página 1 del buffer a imagen.

    const {
      data: { text },
    } = await Tesseract.recognize(
      pdfBuffer,
      'spa', // Idioma español
      { logger: (m) => logger.debug(m) }, // Opcional: ver progreso en consola
    );

    if (!text || text.length < 10) {
      throw new Error('OCR fallido o texto insuficiente.');
    }

    return text;
  } catch (err) {
    logger.error('Error en Tesseract:', err);
    throw new Error('Error procesando el OCR.');
  }
};
