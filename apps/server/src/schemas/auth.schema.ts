import { z } from 'zod';

// Los dos campos son obligatorios (HU #27).
export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Requerido'),
  password: z.string().min(1, 'Requerido'),
});

export type LoginInput = z.infer<typeof loginSchema>;
