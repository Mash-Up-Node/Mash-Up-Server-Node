import { z } from 'zod';

export const DanggnsShakeRequestSchema = z.object({
  roundId: z.number().int().positive(),
  shakeCount: z.number().int().nonnegative(),
  isFever: z.boolean(),
  sentAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'sentAt must be a valid datetime string',
  }),
});

export type DanggnsShakeRequestDto = z.infer<typeof DanggnsShakeRequestSchema>;
