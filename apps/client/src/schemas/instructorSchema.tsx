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
  username: z.string().optional(),
});

export type InstructorFormData = z.infer<typeof instructorSchema>;