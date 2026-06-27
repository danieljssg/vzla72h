import { z } from 'zod';

const CATEGORIES = ['food', 'health', 'hygiene', 'tools', 'clothing', 'others'];

const nameField = z.string().min(2, 'name must be at least 2 characters').max(120).trim();

export const createItemSchema = z.object({
  name: nameField,
  category: z.enum(CATEGORIES, { errorMap: () => ({ message: 'Invalid category' }) }),
  unit: z.string().min(1).max(30).trim().optional().default('boxes'),
});

export const updateItemSchema = z
  .object({
    name: nameField.optional(),
    category: z.enum(CATEGORIES).optional(),
    unit: z.string().min(1).max(30).trim().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Body must not be empty' });
