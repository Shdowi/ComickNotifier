import { boolean, integer, pgTable, serial, text, timestamp, varchar, jsonb, primaryKey } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import type { AdapterAccount } from '@auth/core/adapters'

// Users table for authentication
export const users = pgTable('users', {
  id: text('id').notNull().primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  hashedPassword: text('hashedPassword'),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
  // Notification preferences
  discordWebhook: text('discordWebhook'),
  discordNotifications: boolean('discordNotifications').default(true).notNull(),
})

export const accounts = pgTable(
  'accounts',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccount['type']>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
)

export const sessions = pgTable('sessions', {
  sessionToken: text('sessionToken').notNull().primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
})

export const verificationTokens = pgTable(
  'verificationTokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
)

// Series table - stores manga/comic series information
export const series = pgTable('series', {
  id: serial('id').primaryKey(),
  title: text('title').notNull().unique(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  coverImage: text('coverImage'),
  genres: jsonb('genres').$type<string[]>().default([]),
  status: varchar('status', { length: 20 }).default('ongoing').notNull(), // ongoing, completed, hiatus
  comickId: text('comickId').unique(),
  lastChapter: text('lastChapter'),
  lastUpdated: timestamp('lastUpdated', { mode: 'date' }),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
})

// User subscriptions to series
export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  seriesId: integer('seriesId')
    .notNull()
    .references(() => series.id, { onDelete: 'cascade' }),
  isActive: boolean('isActive').default(true).notNull(),
  notificationTypes: jsonb('notificationTypes').$type<string[]>().default(['discord']), // discord webhook
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
})

// Chapters table - stores individual chapter releases
export const chapters = pgTable('chapters', {
  id: serial('id').primaryKey(),
  seriesId: integer('seriesId')
    .notNull()
    .references(() => series.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  chapterNumber: text('chapterNumber').notNull(),
  releaseDate: timestamp('releaseDate', { mode: 'date' }).notNull(),
  comickUrl: text('comickUrl'),
  isProcessed: boolean('isProcessed').default(false).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
})

// Notifications sent to users
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  chapterId: integer('chapterId')
    .notNull()
    .references(() => chapters.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 20 }).notNull(), // discord
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending, sent, failed
  sentAt: timestamp('sentAt', { mode: 'date' }),
  errorMessage: text('errorMessage'),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
})

// System configuration and monitoring
export const systemConfig = pgTable('systemConfig', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
})

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  subscriptions: many(subscriptions),
  notifications: many(notifications),
  accounts: many(accounts),
  sessions: many(sessions),
}))

export const seriesRelations = relations(series, ({ many }) => ({
  subscriptions: many(subscriptions),
  chapters: many(chapters),
}))

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  series: one(series, {
    fields: [subscriptions.seriesId],
    references: [series.id],
  }),
}))

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
  series: one(series, {
    fields: [chapters.seriesId],
    references: [series.id],
  }),
  notifications: many(notifications),
}))

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  chapter: one(chapters, {
    fields: [notifications.chapterId],
    references: [chapters.id],
  }),
}))

// Types
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Series = typeof series.$inferSelect
export type NewSeries = typeof series.$inferInsert
export type Subscription = typeof subscriptions.$inferSelect
export type NewSubscription = typeof subscriptions.$inferInsert
export type Chapter = typeof chapters.$inferSelect
export type NewChapter = typeof chapters.$inferInsert
export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert 