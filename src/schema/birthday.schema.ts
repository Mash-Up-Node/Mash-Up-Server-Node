import { relations } from 'drizzle-orm';
import {
  bigint,
  bigserial,
  boolean,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { generations, members } from './schema';

export const birthdayImageTypeEnum = pgEnum('birthday_image_type_enum', [
  'CAKE',
  'GIFT',
  'PARTY',
  'CUSTOM',
]);

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
      { onDelete: 'set null' },
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
