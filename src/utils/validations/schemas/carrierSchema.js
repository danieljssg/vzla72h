import { z } from 'zod';

const VEHICLE_TYPES = ['motorcycle', 'car', 'pickup', 'truck', 'trailer', 'heavy_machinery'];

const STATUSES = ['available', 'assigned', 'inactive'];

const licensePlateField = z
  .string()
  .min(4)
  .max(20)
  .regex(/^[A-Za-z0-9-]+$/, 'licensePlate may only contain letters, numbers and hyphens')
  .trim()
  .transform((v) => v.toUpperCase());

const driverSchema = z.object({
  firstName: z.string().min(1).max(60).trim(),
  lastName: z.string().min(1).max(60).trim(),
  idNumber: z.string().min(4).max(20).trim(),
  phone: z.string().min(7).max(30).trim(),
});

export const createCarrierSchema = z.object({
  licensePlate: licensePlateField,
  vehicleType: z.enum(VEHICLE_TYPES),
  model: z.string().min(1).max(80).trim(),
  driver: driverSchema,
  status: z.enum(STATUSES).optional().default('available'),
});

export const updateCarrierSchema = z
  .object({
    licensePlate: licensePlateField.optional(),
    vehicleType: z.enum(VEHICLE_TYPES).optional(),
    model: z.string().min(1).max(80).trim().optional(),
    driver: driverSchema.optional(),
    status: z.enum(STATUSES).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Body must not be empty' });

export const carrierStatusSchema = z.object({
  status: z.enum(STATUSES),
});
