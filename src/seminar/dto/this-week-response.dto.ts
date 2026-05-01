import { z } from 'zod';

const attendanceStatusSchema = z.enum([
  'ATTENDED',
  'LATE',
  'ABSENT',
  'PENDING',
]);

const attendancePhaseSchema = z.enum(['BEFORE', 'IN_PROGRESS', 'COMPLETED']);

const attendanceRecordSchema = z.object({
  checkpointId: z.number(),
  label: z.string(),
  status: attendanceStatusSchema,
  checkedAt: z.string().nullable(),
});

const attendanceSchema = z.object({
  phase: attendancePhaseSchema,
  viewerName: z.string(),
  records: z.array(attendanceRecordSchema),
});

const badgeSchema = z.object({
  type: z.literal('SEMINAR'),
  label: z.string(),
});

const thisWeekSeminarSchema = z.object({
  seminarId: z.number(),
  badge: badgeSchema,
  title: z.string(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  locationName: z.string().nullable(),
  notice: z.string().nullable(),
  attendance: attendanceSchema,
});

export const thisWeekResponseSchema = z.object({
  serverTime: z.string(),
  generation: z.object({ id: z.number(), number: z.number() }),
  daysUntilNextSeminar: z.number().nullable(),
  thisWeekSeminar: thisWeekSeminarSchema.nullable(),
});

export type ThisWeekResponseDto = z.infer<typeof thisWeekResponseSchema>;
export type ThisWeekSeminar = z.infer<typeof thisWeekSeminarSchema>;
export type Attendance = z.infer<typeof attendanceSchema>;
export type AttendanceStatus = z.infer<typeof attendanceStatusSchema>;
export type AttendancePhase = z.infer<typeof attendancePhaseSchema>;
