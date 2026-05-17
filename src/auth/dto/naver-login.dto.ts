import { z } from 'zod';

export const naverLoginSchema = z.object({
  authorizationCode: z.string().trim().min(1),
  state: z.string().refine((value) => value.trim().length > 0),
  authClient: z.enum(['WEB', 'NATIVE']).optional().default('WEB'),
});

export type NaverLoginDto = z.infer<typeof naverLoginSchema>;
