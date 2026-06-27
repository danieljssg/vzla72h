import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.').trim().toLowerCase(),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres.').trim().toLowerCase(),
  email: z.string().email('Formato de correo electrónico inválido.').trim().toLowerCase(),
  profilePicture: z.string().url().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).trim().toLowerCase().optional(),
  lastName: z.string().min(2).trim().toLowerCase().optional(),
  email: z
    .string()
    .email('Formato de correo electrónico inválido.')
    .trim()
    .toLowerCase()
    .optional(),
  isActive: z.boolean().optional(),
  profilePicture: z.string().url().optional(),
});

export const getUserProfileSchema = z.object({
  tagId: z.string().min(1),
});
