import { z } from 'zod';

const platformEnumSchema = z.enum([
  'NODE',
  'SPRING',
  'WEB',
  'iOS',
  'ANDROID',
  'DESIGN',
]);

const checkpointItemSchema = z.object({
  checkpointId: z.number(),
  label: z.string(),
  order: z.number(),
});

const socialLinksSchema = z
  .object({
    instagram: z.string().optional(),
    github: z.string().optional(),
    behance: z.string().optional(),
    linkedin: z.string().optional(),
    tistory: z.string().optional(),
  })
  .partial();

const memberProfileSchema = z.object({
  birthday: z.string().nullable(),
  jobTitle: z.string().nullable(),
  company: z.string().nullable(),
  bio: z.string().nullable(),
  socialLinks: socialLinksSchema,
  activityScore: z.number(),
});

const activityCardSchema = z.object({
  generationNumber: z.number(),
  platform: platformEnumSchema,
  role: z.string(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

const memberRecordSchema = z.object({
  checkpointId: z.number(),
  label: z.string(),
  status: z.enum(['ATTENDED', 'LATE', 'ABSENT', 'PENDING']),
  checkedAt: z.string().nullable(),
});

const memberItemSchema = z.object({
  memberId: z.number(),
  name: z.string(),
  profile: memberProfileSchema,
  activityCard: activityCardSchema,
  records: z.array(memberRecordSchema),
});

export const attendancePlatformMembersResponseSchema = z.object({
  seminarId: z.number(),
  platform: platformEnumSchema,
  label: z.string(),
  memberCount: z.number(),
  checkpoints: z.array(checkpointItemSchema),
  members: z.array(memberItemSchema),
});

export type AttendancePlatformMembersResponseDto = z.infer<
  typeof attendancePlatformMembersResponseSchema
>;
