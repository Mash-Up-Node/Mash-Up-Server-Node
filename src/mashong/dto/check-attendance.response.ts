import { z } from 'zod';

export const checkAttendanceSchema = z.object({
  memberId: z.number().int().positive(),
  isChecked: z.boolean(),
  attendanceSeq: z.number().int().positive(),
});

export type CheckAttendanceResponseDto = z.infer<typeof checkAttendanceSchema>;
