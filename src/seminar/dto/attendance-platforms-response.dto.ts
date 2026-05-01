import { z } from 'zod';

const platformEnumSchema = z.enum([
  'NODE',
  'SPRING',
  'WEB',
  'iOS',
  'ANDROID',
  'DESIGN',
]);

const attendancePhase4Schema = z.enum([
  'BEFORE',
  'IN_PROGRESS',
  'AGGREGATING',
  'COMPLETED',
]);

const bannerToneSchema = z.enum(['info', 'success', 'warning', 'error']);

const checkpointItemSchema = z.object({
  checkpointId: z.number(),
  label: z.string(),
  order: z.number(),
});

const platformSummarySchema = z.object({
  total: z.number(),
  attended: z.number(),
  late: z.number(),
  absent: z.number(),
});

const platformItemSchema = z.object({
  platformId: z.string(),
  platform: platformEnumSchema,
  label: z.string(),
  memberCount: z.number(),
  summary: platformSummarySchema,
});

export const attendancePlatformsResponseSchema = z.object({
  seminarId: z.number(),
  title: z.string(),
  attendancePhase: attendancePhase4Schema,
  banner: z.object({
    tone: bannerToneSchema,
    message: z.string(),
  }),
  checkpoints: z.array(checkpointItemSchema),
  platforms: z.array(platformItemSchema),
});

export type AttendancePlatformsResponseDto = z.infer<
  typeof attendancePlatformsResponseSchema
>;
export type AttendancePhase4 = z.infer<typeof attendancePhase4Schema>;
export type BannerTone = z.infer<typeof bannerToneSchema>;
