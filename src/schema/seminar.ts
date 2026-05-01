import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  bigserial,
  check,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';
import {
  attendanceCheckMethodEnum,
  attendanceStatusEnum,
  generations,
  members,
} from './schema';

export const seminarSchedules = pgTable(
  'seminar_schedules',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    generationId: bigint('generation_id', { mode: 'number' })
      .notNull()
      .references(() => generations.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    venueName: varchar('venue_name', { length: 255 }),
    venueAddress: varchar('venue_address', { length: 500 }),
    venueLat: numeric('venue_lat', { precision: 9, scale: 6 }),
    venueLng: numeric('venue_lng', { precision: 9, scale: 6 }),
    notice: text('notice'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('seminar_schedules_generation_id_idx').on(table.generationId),
  ],
);

export const seminarSections = pgTable(
  'seminar_sections',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    seminarScheduleId: bigint('seminar_schedule_id', { mode: 'number' })
      .notNull()
      .references(() => seminarSchedules.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    sortOrder: integer('sort_order').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique('seminar_sections_schedule_sort_order_uq').on(
      table.seminarScheduleId,
      table.sortOrder,
    ),
    check('seminar_sections_sort_order_gte_1_ck', sql`${table.sortOrder} >= 1`),
  ],
);

export const seminarItems = pgTable(
  'seminar_items',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    seminarSectionId: bigint('seminar_section_id', { mode: 'number' })
      .notNull()
      .references(() => seminarSections.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    sortOrder: integer('sort_order').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique('seminar_items_section_sort_order_uq').on(
      table.seminarSectionId,
      table.sortOrder,
    ),
    check('seminar_items_sort_order_gte_1_ck', sql`${table.sortOrder} >= 1`),
  ],
);

export const attendanceCheckpoints = pgTable(
  'attendance_checkpoints',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    seminarScheduleId: bigint('seminar_schedule_id', { mode: 'number' })
      .notNull()
      .references(() => seminarSchedules.id, { onDelete: 'cascade' }),
    roundNo: integer('round_no').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    openedAt: timestamp('opened_at', { withTimezone: true }).notNull(),
    lateAt: timestamp('late_at', { withTimezone: true }).notNull(),
    closedAt: timestamp('closed_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique('attendance_checkpoints_schedule_round_uq').on(
      table.seminarScheduleId,
      table.roundNo,
    ),
    check(
      'attendance_checkpoints_round_no_gte_1_ck',
      sql`${table.roundNo} >= 1`,
    ),
  ],
);

export const seminarAttendanceRecords = pgTable(
  'seminar_attendance_records',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    attendanceCheckpointId: bigint('attendance_checkpoint_id', {
      mode: 'number',
    })
      .notNull()
      .references(() => attendanceCheckpoints.id, { onDelete: 'cascade' }),
    memberId: bigint('member_id', { mode: 'number' })
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    scoreDelta: integer('score_delta').notNull(),
    status: attendanceStatusEnum('status').notNull(),
    checkedAt: timestamp('checked_at', { withTimezone: true }),
    checkMethod: attendanceCheckMethodEnum('check_method'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique('seminar_attendance_records_checkpoint_member_uq').on(
      table.attendanceCheckpointId,
      table.memberId,
    ),
  ],
);

export const seminarSchedulesRelations = relations(
  seminarSchedules,
  ({ one, many }) => ({
    generation: one(generations, {
      fields: [seminarSchedules.generationId],
      references: [generations.id],
    }),
    seminarSections: many(seminarSections),
    attendanceCheckpoints: many(attendanceCheckpoints),
  }),
);

export const seminarSectionsRelations = relations(
  seminarSections,
  ({ one, many }) => ({
    seminarSchedule: one(seminarSchedules, {
      fields: [seminarSections.seminarScheduleId],
      references: [seminarSchedules.id],
    }),
    seminarItems: many(seminarItems),
  }),
);

export const seminarItemsRelations = relations(seminarItems, ({ one }) => ({
  seminarSection: one(seminarSections, {
    fields: [seminarItems.seminarSectionId],
    references: [seminarSections.id],
  }),
}));

export const attendanceCheckpointsRelations = relations(
  attendanceCheckpoints,
  ({ one, many }) => ({
    seminarSchedule: one(seminarSchedules, {
      fields: [attendanceCheckpoints.seminarScheduleId],
      references: [seminarSchedules.id],
    }),
    seminarAttendanceRecords: many(seminarAttendanceRecords),
  }),
);

export const seminarAttendanceRecordsRelations = relations(
  seminarAttendanceRecords,
  ({ one }) => ({
    attendanceCheckpoint: one(attendanceCheckpoints, {
      fields: [seminarAttendanceRecords.attendanceCheckpointId],
      references: [attendanceCheckpoints.id],
    }),
    member: one(members, {
      fields: [seminarAttendanceRecords.memberId],
      references: [members.id],
    }),
  }),
);
