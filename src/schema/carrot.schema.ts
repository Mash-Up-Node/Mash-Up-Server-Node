import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  bigserial,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { generations, members, platformEnum } from './schema';

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
