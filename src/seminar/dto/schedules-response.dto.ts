import { z } from 'zod';

const weekdaySchema = z.enum(['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']);

const scheduleItemSchema = z.object({
  seminarId: z.number(),
  date: z.string(),
  weekday: weekdaySchema,
  title: z.string(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  locationName: z.string().nullable(),
  isHighlighted: z.boolean(),
});

const monthGroupSchema = z.object({
  year: z.number(),
  month: z.number(),
  items: z.array(scheduleItemSchema),
});

export const schedulesResponseSchema = z.object({
  generation: z.object({
    id: z.number(),
    number: z.number(),
  }),
  months: z.array(monthGroupSchema),
});

export type SchedulesResponseDto = z.infer<typeof schedulesResponseSchema>;
export type ScheduleItem = z.infer<typeof scheduleItemSchema>;
