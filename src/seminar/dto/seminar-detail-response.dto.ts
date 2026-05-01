import { z } from 'zod';

const programItemSchema = z.object({
  order: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  startsAt: z.string().nullable(),
});

const programSectionSchema = z.object({
  sectionNo: z.number(),
  title: z.string(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  items: z.array(programItemSchema),
});

const locationSchema = z.object({
  name: z.string().nullable(),
  address: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  mapImageUrl: z.string().nullable(),
});

export const seminarDetailResponseSchema = z.object({
  seminarId: z.number(),
  title: z.string(),
  date: z.string(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  location: locationSchema,
  notice: z.string().nullable(),
  programSections: z.array(programSectionSchema),
  attendanceAvailable: z.boolean(),
});

export type SeminarDetailResponseDto = z.infer<
  typeof seminarDetailResponseSchema
>;
