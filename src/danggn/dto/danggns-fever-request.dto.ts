import { z } from 'zod';

export const DanggnsFeverRequestSchema = z.object({
  roundId: z.number().int().positive(),
});

export type DanggnsFeverRequestDto = z.infer<typeof DanggnsFeverRequestSchema>;
