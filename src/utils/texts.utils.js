export const sanitizeFileName = (fileName) => {
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s/g, '_')
    .replace(/[^a-zA-Z0-9_().-]/g, '');
};

export const fuzzyMatchName = (name, text) => {
  if (!name || !text) return false;

  const normalize = (str) =>
    str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  const normalizedText = normalize(text);
  const nameParts = normalize(name)
    .split(/\s+/)
    .filter((p) => p.length > 2);

  if (nameParts.length === 0) return true;

  let matches = 0;
  for (const part of nameParts) {
    const regexStr = part
      .split('')
      .map((char) => `${char}+`)
      .join('[\\s\\W]*');
    const regex = new RegExp(regexStr);
    if (regex.test(normalizedText)) {
      matches++;
    }
  }

  return matches > 0;
};
