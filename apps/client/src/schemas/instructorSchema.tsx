// apps/client/src/schemas/instructorSchema.ts
import { z } from 'zod';

export const instructorSchema = z.object({
  nombres: z.string().min(1, 'El nombre es obligatorio'),
  apPaterno: z.string().min(1, 'El apellido paterno es obligatorio'),
  apMaterno: z.string().min(1, 'El apellido materno es obligatorio'),
  ci: z.string().min(1, 'El CI es obligatorio'),
  telefono: z.string().min(1, 'El teléfono es obligatorio'),
  email: z.string().min(1, 'El correo es obligatorio').email('Formato de correo inválido'),
  cargo: z.string().min(1, 'El cargo es obligatorio'),
  estado: z.boolean(),
  username: z
    .string()
    .trim()
    .regex(
      /^[A-Za-z0-9._-]{4,50}$/,
      'El usuario debe tener entre 4 y 50 caracteres (letras, números, . _ -)'
    ),
});

export type InstructorFormData = z.infer<typeof instructorSchema>;