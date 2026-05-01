import { z } from 'zod';

export const getMashongInfoSchema = z.object({
  id: z.number().int().positive(),
  platform: z.string(),
  level: z.number().int().positive(),
  accumulatedPopcorn: z.number().positive(),
  lastPopcorn: z.number().positive(),
  goalPopcorn: z.number().positive(),
});

export type GetMashongInfoResponseDto = z.infer<typeof getMashongInfoSchema>;
