import { z } from 'zod';

const latField = z.number().min(-90, 'lat must be between -90 and 90').max(90);
const lngField = z.number().min(-180, 'lng must be between -180 and 180').max(180);

const locationSchema = z.object({
  state: z.string().min(2).max(80).trim(),
  city: z.string().min(2).max(80).trim(),
  parish: z.string().min(2).max(80).trim(),
  address: z.string().min(2).max(200).trim(),
  lat: latField,
  lng: lngField,
});

export const createSupplyCenterSchema = z.object({
  name: z.string().min(2).max(120).trim(),
  phone: z.string().min(7).max(30).trim().optional(),
  location: locationSchema,
  isActive: z.boolean().optional().default(true),
});

export const updateSupplyCenterSchema = z
  .object({
    name: z.string().min(2).max(120).trim().optional(),
    phone: z.string().min(7).max(30).trim().optional(),
    location: locationSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Body must not be empty' });
