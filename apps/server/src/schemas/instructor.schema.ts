import { z } from 'zod';

const ciRegex = /^\d{5,20}$/;
const telefonoRegex = /^\+?\d{7,15}$/;
const usernameRegex = /^[A-Za-z0-9._-]{4,50}$/;

export const createInstructorSchema = z.object({
  nombres: z
    .string({ error: 'Nombres es obligatorio' })
    .trim()
    .min(1, 'Nombres es obligatorio')
    .max(255, 'Nombres debe tener como máximo 255 caracteres'),
  apPaterno: z
    .string({ error: 'Apellido paterno es obligatorio' })
    .trim()
    .min(1, 'Apellido paterno es obligatorio')
    .max(255, 'Apellido paterno debe tener como máximo 255 caracteres'),
  apMaterno: z
    .string({ error: 'Apellido materno es obligatorio' })
    .trim()
    .min(1, 'Apellido materno es obligatorio')
    .max(255, 'Apellido materno debe tener como máximo 255 caracteres'),
  ci: z
    .string({ error: 'El CI es obligatorio' })
    .trim()
    .regex(ciRegex, 'El CI debe tener entre 5 y 20 dígitos, sin letras'),
  telefono: z
    .string({ error: 'El teléfono es obligatorio' })
    .trim()
    .regex(telefonoRegex, 'El teléfono debe tener entre 7 y 15 dígitos'),
  cargo: z
    .string({ error: 'El cargo es obligatorio' })
    .trim()
    .min(1, 'El cargo es obligatorio')
    .max(100, 'El cargo debe tener como máximo 100 caracteres'),
  email: z
    .string({ error: 'El correo es obligatorio' })
    .trim()
    .toLowerCase()
    .pipe(z.email('El correo no tiene un formato válido')),
  username: z
    .string({ error: 'El nombre de usuario es obligatorio' })
    .trim()
    .regex(usernameRegex, 'El usuario debe tener entre 4 y 50 caracteres (letras, números, . _ -)'),
  estado: z.boolean({ error: 'El estado es obligatorio' }),
});

export const instructorsQuerySchema = z.object({
  search: z.string().trim().optional(),
  estado: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type CreateInstructorInput = z.infer<typeof createInstructorSchema>;
export type InstructorsQuery = z.infer<typeof instructorsQuerySchema>;
