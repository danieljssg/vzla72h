import { z } from 'zod';

const coordinatesSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

const locationSchema = z.object({
  state: z.string().min(2).max(80).trim(),
  city: z.string().min(2).max(80).trim(),
  parish: z.string().min(2).max(80).trim(),
  address: z.string().min(2).max(200).trim(),
  coordinates: coordinatesSchema,
});

// Allow either a raw base64 string or a full data URL ("data:image/png;base64,...").
// Max ~5 MB of base64 (~3.75 MB binary) by default.
const PHOTO_BASE64_MAX = 7 * 1024 * 1024; // 7 MB to leave some headroom
const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

const base64Photo = z
  .string()
  .min(20, 'photo base64 is too short')
  .max(PHOTO_BASE64_MAX, 'photo base64 exceeds maximum size');

const photoSchema = z
  .object({
    data: base64Photo,
    mimeType: z.string().refine((m) => ALLOWED_MIME.includes(m), {
      message: `mimeType must be one of: ${ALLOWED_MIME.join(', ')}`,
    }),
  })
  .optional();

export const createSupplyCenterSchema = z.object({
  name: z.string().min(2).max(120).trim(),
  phone: z.string().min(7).max(30).trim().optional(),
  location: locationSchema,
  isActive: z.boolean().optional().default(true),
  photo: photoSchema,
});

export const updateSupplyCenterSchema = z
  .object({
    name: z.string().min(2).max(120).trim().optional(),
    phone: z.string().min(7).max(30).trim().optional(),
    location: locationSchema.optional(),
    isActive: z.boolean().optional(),
    photo: photoSchema,
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Body must not be empty' });
