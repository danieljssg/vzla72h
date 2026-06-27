import { extractText, getDocumentProxy } from 'unpdf';

export const processPdfText = async (buffer) => {
  const pdf = await getDocumentProxy(buffer);

  const { text } = await extractText(pdf, { mergePages: true });

  if (!text || text.trim().length < 100) {
    return { shouldOCR: true, content: null };
  }

  const cleanText = text
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E\xA1-\xFF]/g, '')
    .trim();

  return { shouldOCR: false, content: cleanText };
};
