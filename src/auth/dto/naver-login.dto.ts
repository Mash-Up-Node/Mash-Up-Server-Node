import { z } from 'zod';

export const naverLoginSchema = z.object({
  authorizationCode: z.string().trim().min(1),
  state: z.string().trim().min(1),
  authClient: z.enum(['WEB', 'NATIVE']).optional().default('WEB'),
});

export type NaverLoginDto = z.infer<typeof naverLoginSchema>;
