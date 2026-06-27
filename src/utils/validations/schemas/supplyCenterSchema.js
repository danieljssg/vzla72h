import { z } from 'zod';

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId')
  .trim();

const locationSchema = z.object({
  state: z.string().min(2).max(80).trim(),
  city: z.string().min(2).max(80).trim(),
  parish: z.string().min(2).max(80).trim(),
  address: z.string().min(2).max(200).trim(),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
});

export const createSupplyCenterSchema = z.object({
  name: z.string().min(2).max(120).trim(),
  managerId: objectId,
  phone: z.string().min(7).max(30).trim(),
  location: locationSchema,
  isActive: z.boolean().optional().default(true),
});

export const updateSupplyCenterSchema = z
  .object({
    name: z.string().min(2).max(120).trim().optional(),
    managerId: objectId.optional(),
    phone: z.string().min(7).max(30).trim().optional(),
    location: locationSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Body must not be empty' });
