import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  bigserial,
  boolean,
  check,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  varchar,
  index,
} from 'drizzle-orm/pg-core';

export const oauthProviderEnum = pgEnum('oauth_provider_enum', ['NAVER']);

export const generationStatusEnum = pgEnum('generation_status_enum', [
  'BEFORE_START',
  'ACTIVE',
  'COMPLETED',
]);

export const platformEnum = pgEnum('platform_enum', [
  'NODE',
  'SPRING',
  'WEB',
  'iOS',
  'ANDROID',
  'DESIGN',
]);

export const generationRoleEnum = pgEnum('generation_role_enum', [
  'LEADER',
  'SUBLEADER',
  'MEMBER',
]);

export const generationActivityStatusEnum = pgEnum(
  'generation_activity_status_enum',
  ['ACTIVE', 'DROPPED'],
);

export const attendanceStatusEnum = pgEnum('attendance_status_enum', [
  'ATTENDED',
  'LATE',
  'ABSENT',
]);

export const attendanceCheckMethodEnum = pgEnum(
  'attendance_check_method_enum',
  ['QR', 'MANUAL'],
);

export const birthdayImageTypeEnum = pgEnum('birthday_image_type_enum', [
  'CAKE',
  'GIFT',
  'PARTY',
  'CUSTOM',
]);

export const members = pgTable('members', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  oauthProvider: oauthProviderEnum('oauth_provider').notNull(),
  oauthProviderUserId: varchar('oauth_provider_user_id', {
    length: 255,
  }).notNull(),
  email: varchar('email', { length: 320 }),
  name: varchar('name', { length: 100 }),
  signupCompleted: boolean('signup_completed').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const memberProfiles = pgTable('member_profiles', {
  memberId: bigint('member_id', { mode: 'number' })
    .primaryKey()
    .references(() => members.id, { onDelete: 'cascade' }),
  birthDate: date('birth_date'),
  jobTitle: varchar('job_title', { length: 100 }),
  company: varchar('company', { length: 120 }),
  bio: text('bio'),
  region: varchar('region', { length: 80 }),
  instagramUrl: varchar('instagram_url', { length: 2048 }),
  githubUrl: varchar('github_url', { length: 2048 }),
  behanceUrl: varchar('behance_url', { length: 2048 }),
  linkedinUrl: varchar('linkedin_url', { length: 2048 }),
  tistoryUrl: varchar('tistory_url', { length: 2048 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const generations = pgTable(
  'generations',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    number: integer('number').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }).notNull(),
    status: generationStatusEnum('status').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex('generations_number_uq').on(table.number)],
);

export const memberGenerationActivities = pgTable(
  'member_generation_activities',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    memberId: bigint('member_id', { mode: 'number' })
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    generationId: bigint('generation_id', { mode: 'number' })
      .notNull()
      .references(() => generations.id, { onDelete: 'cascade' }),
    platform: platformEnum('platform').notNull(),
    role: generationRoleEnum('role').notNull(),
    status: generationActivityStatusEnum('status').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull(),
    leftAt: timestamp('left_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique('member_generation_activities_member_generation_uq').on(
      table.memberId,
      table.generationId,
    ),
  ],
);

export const inviteCodes = pgTable(
  'invite_codes',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    code: varchar('code', { length: 100 }).notNull(),
    generationId: bigint('generation_id', { mode: 'number' })
      .notNull()
      .references(() => generations.id, { onDelete: 'cascade' }),
    createdByMemberId: bigint('created_by_member_id', {
      mode: 'number',
    }).references(() => members.id, { onDelete: 'set null' }),
    platform: platformEnum('platform').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    isActive: boolean('is_active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('invite_codes_code_uq').on(table.code),
    index('invite_codes_generation_id_idx').on(table.generationId),
    index('invite_codes_created_by_member_id_idx').on(table.createdByMemberId),
  ],
);

export const inviteCodeUsages = pgTable(
  'invite_code_usages',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    inviteCodeId: bigint('invite_code_id', { mode: 'number' })
      .notNull()
      .references(() => inviteCodes.id, { onDelete: 'cascade' }),
    memberId: bigint('member_id', { mode: 'number' })
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    usedAt: timestamp('used_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('invite_code_usages_invite_code_id_idx').on(table.inviteCodeId),
    uniqueIndex('invite_code_usages_member_id_uq').on(table.memberId),
  ],
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    memberId: bigint('member_id', { mode: 'number' })
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 255 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('refresh_tokens_member_id_idx').on(table.memberId)],
);

export const seminarSchedules = pgTable(
  'seminar_schedules',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    generationId: bigint('generation_id', { mode: 'number' })
      .notNull()
      .references(() => generations.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }).notNull(),
    venueName: varchar('venue_name', { length: 255 }).notNull(),
    venueAddress: varchar('venue_address', { length: 500 }),
    venueLat: numeric('venue_lat', { precision: 9, scale: 6 }),
    venueLng: numeric('venue_lng', { precision: 9, scale: 6 }),
    notice: text('notice').notNull(),
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

export const carrotRounds = pgTable(
  'carrot_rounds',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    generationId: bigint('generation_id', { mode: 'number' })
      .notNull()
      .references(() => generations.id, { onDelete: 'cascade' }),
    roundNo: integer('round_no').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique('carrot_rounds_generation_round_uq').on(
      table.generationId,
      table.roundNo,
    ),
    check('carrot_rounds_round_no_gte_1_ck', sql`${table.roundNo} >= 1`),
  ],
);

export const carrotRoundRankings = pgTable(
  'carrot_round_rankings',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    roundId: bigint('round_id', { mode: 'number' })
      .notNull()
      .references(() => carrotRounds.id, { onDelete: 'cascade' }),
    memberId: bigint('member_id', { mode: 'number' })
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    finalRank: integer('final_rank').notNull(),
    finalScore: integer('final_score').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('carrot_round_rankings_round_member_uq').on(
      table.roundId,
      table.memberId,
    ),
    index('carrot_round_rankings_round_id_idx').on(table.roundId),
    index('carrot_round_rankings_member_id_idx').on(table.memberId),
    check(
      'carrot_round_rankings_final_rank_gte_1_ck',
      sql`${table.finalRank} >= 1`,
    ),
    check(
      'carrot_round_rankings_final_score_gte_0_ck',
      sql`${table.finalScore} >= 0`,
    ),
  ],
);

export const carrotShakeEvents = pgTable(
  'carrot_shake_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    roundId: bigint('round_id', { mode: 'number' })
      .notNull()
      .references(() => carrotRounds.id, { onDelete: 'cascade' }),
    memberId: bigint('member_id', { mode: 'number' })
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    scoreDelta: integer('score_delta').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('carrot_shake_events_round_id_idx').on(table.roundId),
    index('carrot_shake_events_member_id_idx').on(table.memberId),
  ],
);

export const carrotStakedCount = pgTable(
  'carrot_staked_count',
  {
    memberId: bigint('member_id', { mode: 'number' })
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    generationId: bigint('generation_id', { mode: 'number' })
      .notNull()
      .references(() => generations.id, { onDelete: 'cascade' }),
    platform: platformEnum('platform').notNull(),
    shakeCount: bigint('shake_count', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    primaryKey({ columns: [table.memberId, table.generationId] }),
    unique('carrot_staked_count_member_generation_uq').on(
      table.memberId,
      table.generationId,
    ),
  ],
);

export const images = pgTable(
  'images',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    uploaderId: bigint('uploader_id', { mode: 'number' })
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    storagePath: varchar('storage_path', { length: 2048 }).notNull(),
    originalName: varchar('original_name', { length: 512 }).notNull(),
    mimeType: varchar('mime_type', { length: 255 }).notNull(),
    isActive: boolean('is_active').notNull(),
    size: bigint('size', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex('images_storage_path_uq').on(table.storagePath)],
);

export const birthdayCards = pgTable(
  'birthday_cards',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    senderMemberId: bigint('sender_member_id', { mode: 'number' })
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    receiverMemberId: bigint('receiver_member_id', { mode: 'number' })
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    generationId: bigint('generation_id', { mode: 'number' })
      .notNull()
      .references(() => generations.id, { onDelete: 'cascade' }),
    imageId: bigint('image_id', { mode: 'number' }).references(
      () => images.id,
      {
        onDelete: 'set null',
      },
    ),
    imageType: birthdayImageTypeEnum('image_type').notNull(),
    message: text('message').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique('birthday_cards_sender_receiver_generation_uq').on(
      table.senderMemberId,
      table.receiverMemberId,
      table.generationId,
    ),
  ],
);

export const mashongAttendance = pgTable(
  'mashong_attendance',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    memberId: bigint('member_id', { mode: 'number' })
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    seq: integer('seq').notNull(),
    attendanceDate: date('attendance_date', { mode: 'string' })
      .notNull()
      .default(sql`CURRENT_DATE`),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('mashong_attendance_member_date_seq_uq').on(
      table.memberId,
      table.attendanceDate,
      table.seq,
    ),
  ],
);

export const membersRelations = relations(members, ({ one, many }) => ({
  profile: one(memberProfiles, {
    fields: [members.id],
    references: [memberProfiles.memberId],
  }),
  generationActivities: many(memberGenerationActivities),
  createdInviteCodes: many(inviteCodes),
  inviteCodeUsages: many(inviteCodeUsages),
  refreshTokens: many(refreshTokens),
  seminarAttendanceRecords: many(seminarAttendanceRecords),
  carrotRoundRankings: many(carrotRoundRankings),
  carrotShakeEvents: many(carrotShakeEvents),
  sentBirthdayCards: many(birthdayCards, { relationName: 'birthday_sender' }),
  receivedBirthdayCards: many(birthdayCards, {
    relationName: 'birthday_receiver',
  }),
  uploadedImages: many(images),
  mashongAttendance: many(mashongAttendance),
}));

export const memberProfilesRelations = relations(memberProfiles, ({ one }) => ({
  member: one(members, {
    fields: [memberProfiles.memberId],
    references: [members.id],
  }),
}));

export const generationsRelations = relations(generations, ({ many }) => ({
  memberGenerationActivities: many(memberGenerationActivities),
  inviteCodes: many(inviteCodes),
  seminarSchedules: many(seminarSchedules),
  carrotRounds: many(carrotRounds),
  birthdayCards: many(birthdayCards),
  carrotStakedCounts: many(carrotStakedCount),
}));

export const memberGenerationActivitiesRelations = relations(
  memberGenerationActivities,
  ({ one }) => ({
    member: one(members, {
      fields: [memberGenerationActivities.memberId],
      references: [members.id],
    }),
    generation: one(generations, {
      fields: [memberGenerationActivities.generationId],
      references: [generations.id],
    }),
  }),
);

export const inviteCodesRelations = relations(inviteCodes, ({ one, many }) => ({
  generation: one(generations, {
    fields: [inviteCodes.generationId],
    references: [generations.id],
  }),
  createdByMember: one(members, {
    fields: [inviteCodes.createdByMemberId],
    references: [members.id],
  }),
  usages: many(inviteCodeUsages),
}));

export const inviteCodeUsagesRelations = relations(
  inviteCodeUsages,
  ({ one }) => ({
    inviteCode: one(inviteCodes, {
      fields: [inviteCodeUsages.inviteCodeId],
      references: [inviteCodes.id],
    }),
    member: one(members, {
      fields: [inviteCodeUsages.memberId],
      references: [members.id],
    }),
  }),
);

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  member: one(members, {
    fields: [refreshTokens.memberId],
    references: [members.id],
  }),
}));

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

export const carrotRoundsRelations = relations(
  carrotRounds,
  ({ one, many }) => ({
    generation: one(generations, {
      fields: [carrotRounds.generationId],
      references: [generations.id],
    }),
    carrotRoundRankings: many(carrotRoundRankings),
    carrotShakeEvents: many(carrotShakeEvents),
  }),
);

export const carrotRoundRankingsRelations = relations(
  carrotRoundRankings,
  ({ one }) => ({
    round: one(carrotRounds, {
      fields: [carrotRoundRankings.roundId],
      references: [carrotRounds.id],
    }),
    member: one(members, {
      fields: [carrotRoundRankings.memberId],
      references: [members.id],
    }),
  }),
);

export const carrotShakeEventsRelations = relations(
  carrotShakeEvents,
  ({ one }) => ({
    round: one(carrotRounds, {
      fields: [carrotShakeEvents.roundId],
      references: [carrotRounds.id],
    }),
    member: one(members, {
      fields: [carrotShakeEvents.memberId],
      references: [members.id],
    }),
  }),
);

export const carrotStakedCountRelations = relations(
  carrotStakedCount,
  ({ one }) => ({
    member: one(members, {
      fields: [carrotStakedCount.memberId],
      references: [members.id],
    }),
    generation: one(generations, {
      fields: [carrotStakedCount.generationId],
      references: [generations.id],
    }),
  }),
);

export const imagesRelations = relations(images, ({ one, many }) => ({
  uploader: one(members, {
    fields: [images.uploaderId],
    references: [members.id],
  }),
  birthdayCards: many(birthdayCards),
}));

export const birthdayCardsRelations = relations(birthdayCards, ({ one }) => ({
  sender: one(members, {
    fields: [birthdayCards.senderMemberId],
    references: [members.id],
    relationName: 'birthday_sender',
  }),
  receiver: one(members, {
    fields: [birthdayCards.receiverMemberId],
    references: [members.id],
    relationName: 'birthday_receiver',
  }),
  generation: one(generations, {
    fields: [birthdayCards.generationId],
    references: [generations.id],
  }),
  image: one(images, {
    fields: [birthdayCards.imageId],
    references: [images.id],
  }),
}));
