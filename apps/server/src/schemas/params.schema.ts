import { z } from 'zod';

export const idParamsSchema = z.object({
  id: z.coerce
    .number({ error: 'Id must be a positive number' })
    .int('Id must be an integer')
    .positive('Id must be a positive number'),
});