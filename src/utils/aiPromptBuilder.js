import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const RAW_PROMPT = readFileSync(join(__dirname, '../shared/prompts/analysisPrompt.txt'), 'utf-8');

const INSIGHT_TONE =
  'Habla con energía y visión de futuro. Proyecta al candidato como un talento en ascenso donde su hobby es el <power-up> que lo hace  imparable y diferente. Sé ingenioso: explica cómo su pasión personal le da una ventaja única y divertida que otros no tienen. No analices solo el hoy, inspira sobre el impacto que tendrá mañana su perfil híbrido en la industria.';

export const buildPrompt = (cvText, hobby, candidateName) => {
  const submittedData = `Nombre del candidato (dato verificado, usar este exactamente): ${candidateName}
Hobby o pasión del candidato: ${hobby || 'No especificado'}
ID único de análisis: #${Math.floor(Math.random() * 99999)}

Texto del CV:
${cvText}`;

  return RAW_PROMPT.replace('{{submittedData}}', submittedData).replace(
    '{{insightTone}}',
    INSIGHT_TONE,
  );
};
