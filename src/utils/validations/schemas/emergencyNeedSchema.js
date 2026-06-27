import { z } from 'zod';

const CATEGORIES = ['food', 'clothing', 'medicines', 'first_aid', 'tools', 'other'];

export const createEmergencyNeedSchema = z.object({
  zone: z.string().min(2, 'zone must be at least 2 characters').max(200).trim(),
  category: z.enum(CATEGORIES, { errorMap: () => ({ message: 'Invalid category' }) }),
  description: z.string().max(1000).trim().optional().default(''),
  reportedBy: z.string().min(2, 'reportedBy must be at least 2 characters').max(200).trim(),
});

export const updateEmergencyNeedSchema = z
  .object({
    zone: z.string().min(2).max(200).trim().optional(),
    category: z.enum(CATEGORIES).optional(),
    description: z.string().max(1000).trim().optional(),
    reportedBy: z.string().min(2).max(200).trim().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Body must not be empty' });
