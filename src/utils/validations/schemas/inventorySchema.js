import { z } from 'zod';

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId')
  .trim();

const stockEntry = z.object({
  item: objectId,
  quantity: z.number().min(0),
});

export const createInventorySchema = z.object({
  supplyCenter: objectId,
  stocks: z
    .array(stockEntry)
    .min(1, 'stocks must contain at least one entry')
    .optional()
    .default([]),
});

export const updateInventorySchema = z
  .object({
    stocks: z.array(stockEntry).min(1, 'stocks must contain at least one entry').optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Body must not be empty' });

export const adjustStockSchema = z.object({
  item: objectId,
  delta: z.number().refine((n) => Number.isFinite(n) && n !== 0, {
    message: 'delta must be a non-zero finite number',
  }),
  reason: z.string().min(2).max(200).trim().optional(),
});
