import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  bigserial,
  boolean,
  date,
  integer,
  pgEnum,
  pgTable,
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

export const members = pgTable(
  'members',
  {
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
  },
  (table) => [
    // 탈퇴 회원(soft-delete)은 제외하여 동일 네이버 계정으로 재가입을 허용한다.
    uniqueIndex('members_oauth_identity_uq')
      .on(table.oauthProvider, table.oauthProviderUserId)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

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

export const mashong = pgTable(
  'mashong',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    generationId: bigint('generateion_id', { mode: 'number' })
      .notNull()
      .references(() => generations.id, { onDelete: 'cascade' }),
    platform: platformEnum('platform').notNull(),
    level: bigint('level', { mode: 'number' }).notNull().default(1),
    accumulatedPopcorn: bigint('accumulated_popcorn', { mode: 'number' })
      .notNull()
      .default(0),
    lastPopcorn: bigint('last_popcorn', { mode: 'number' })
      .notNull()
      .default(0),
    goalPopcorn: bigint('goal_popcorn', { mode: 'number' })
      .notNull()
      .default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique('mashong_generation_platform_uq').on(
      table.generationId,
      table.platform,
    ),
  ],
);

export const mashongLevel = pgTable(
  'mashong_level',
  {
    level: bigint('level', { mode: 'number' }).notNull(),
    goalPopcorn: bigint('goal_popcorn', { mode: 'number' }).notNull(),
  },
  (table) => [unique('mashong_level_uq').on(table.level)],
);

export const membersRelations = relations(members, ({ one, many }) => ({
  profile: one(memberProfiles, {
    fields: [members.id],
    references: [memberProfiles.memberId],
  }),
  generationActivities: many(memberGenerationActivities),
  createdInviteCodes: many(inviteCodes),
  inviteCodeUsages: many(inviteCodeUsages),
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
  mashong: many(mashong),
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
