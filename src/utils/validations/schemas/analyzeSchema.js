import { z } from 'zod';

const analyzeSchema = z.object({
  hobby: z
    .string()
    .min(2, 'El hobby debe tener al menos 2 caracteres')
    .max(150)
    .trim()
    .optional()
    .default(''),
  candidateName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100).trim(),
});

export { analyzeSchema };
