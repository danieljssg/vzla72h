import { buildStrategies } from './buildStrategies.js';
const SYSTEM_PROMPT =
  'Eres un sistema de extracción de datos. Tu salida debe ser exclusivamente un JSON válido. No incluyas explicaciones ni markdown.';
export const runWithFallback = async (userPrompt, logger) => {
  const strategies = buildStrategies().filter((s) => s.key);

  if (strategies.length === 0) {
    throw new Error(
      '[modelsPool] No hay estrategias de IA configuradas. Revisa tus variables de entorno.',
    );
  }

  for (const strategy of strategies) {
    try {
      logger.info(`[modelsPool] Intentando con: ${strategy.name}`);

      const response = await fetch(strategy.url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${strategy.key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(strategy.getBody(SYSTEM_PROMPT, userPrompt)),
      });

      if (!response.ok) {
        const errBody = await response.text();
        logger.warn(
          `[modelsPool] ${strategy.name} HTTP ${response.status} — saltando. Detalle: ${errBody.slice(0, 200)}`,
        );
        continue;
      }

      const data = await response.json();
      const actualModel = data.model || strategy.name;
      const raw = data.choices?.[0]?.message?.content;

      if (!raw) {
        logger.warn(`[modelsPool] ${strategy.name} devolvió contenido vacío — saltando.`);
        continue;
      }

      const clean = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);

      logger.info(`[modelsPool] ✅ Éxito con ${strategy.name} (modelo real: ${actualModel})`);
      return parsed;
    } catch (err) {
      logger.error(`[modelsPool] Error en ${strategy.name}: ${err.message}`);
    }
  }

  throw new Error('[modelsPool] Todos los proveedores de IA fallaron.');
};
