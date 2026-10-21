import {
  sqliteTable,
  text,
  integer,
  index,
  primaryKey,
} from 'drizzle-orm/sqlite-core';
export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  owner: text('owner').notNull(),
  name: text('name').notNull(),
  open: integer('open').notNull().default(1),
  archived: integer('archived').notNull().default(0),
  tipUrl: text('tip_url'),
  realtimeRetryAfter: integer('realtime_retry_after').notNull().default(0),
  created: text('created').notNull(),
});
export const requests = sqliteTable('requests', {
  id: text('id').primaryKey(),
  event: text('event')
    .notNull()
    .references(() => events.id),
  title: text('title').notNull(),
  artist: text('artist').notNull(),
  guest: text('guest').notNull(),
  message: text('message').notNull(),
  spotify: text('spotify').notNull(),
  image: text('image'),
  status: text('status').notNull().default('pending'),
  created: text('created').notNull(),
  client: text('client').notNull(),
});

export const tipClicks = sqliteTable(
  'tip_clicks',
  {
    event: text('event')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    client: text('client').notNull(),
    created: text('created').notNull(),
  },
  (table) => [primaryKey({ columns: [table.event, table.client] })],
);

export const user = sqliteTable('auth_user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' })
    .notNull()
    .default(false),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const session = sqliteTable(
  'auth_session',
  {
    id: text('id').primaryKey(),
    token: text('token').notNull().unique(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
  },
  (table) => [index('auth_session_user_idx').on(table.userId)],
);

export const account = sqliteTable(
  'auth_account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', {
      mode: 'timestamp_ms',
    }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', {
      mode: 'timestamp_ms',
    }),
    scope: text('scope'),
    password: text('password'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('auth_account_user_idx').on(table.userId)],
);

export const verification = sqliteTable(
  'auth_verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('auth_verification_identifier_idx').on(table.identifier)],
);

export const rateLimit = sqliteTable('auth_rate_limit', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  count: integer('count').notNull(),
  lastRequest: integer('last_request').notNull(),
});
