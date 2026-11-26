import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const siteSettings = sqliteTable('site_settings', {
  id: text('id').primaryKey().default('default'),
  
  // 1. General & Branding Settings
  siteName: text('site_name').notNull().default('My Site'),
  siteDescription: text('site_description').default('Production-ready Fullstack Monorepo Application'),
  siteUrl: text('site_url'),
  siteLogoUrl: text('site_logo_url'),
  siteFaviconUrl: text('site_favicon_url'),
  supportEmail: text('support_email'),

  // 2. Telegram Integration Config
  telegramToken: text('telegram_token'),
  telegramGroupId: text('telegram_group_id'),
  telegramEnabled: integer('telegram_enabled', { mode: 'boolean' }).notNull().default(false),

  // 3. Resend Mail Integration Config
  resendApiKey: text('resend_api_key'),
  mailFrom: text('mail_from'),
  mailFromName: text('mail_from_name').default('System Notification'),
  resendEnabled: integer('resend_enabled', { mode: 'boolean' }).notNull().default(false),

  // 4. Notification Secret Token & Push Keys
  notificationToken: text('notification_token'),
  vapidPublicKey: text('vapid_public_key'),

  // 5. Google OAuth Integration Config
  googleClientId: text('google_client_id'),
  googleClientSecret: text('google_client_secret'),
  googleAuthEnabled: integer('google_auth_enabled', { mode: 'boolean' }).notNull().default(false),

  // 6. Auth & Access Security Settings
  allowRegistration: integer('allow_registration', { mode: 'boolean' }).notNull().default(true),
  requireEmailVerification: integer('require_email_verification', { mode: 'boolean' }).notNull().default(false),

  // 7. Maintenance & Status Control
  maintenanceMode: integer('maintenance_mode', { mode: 'boolean' }).notNull().default(false),
  maintenanceMessage: text('maintenance_message').default('We are currently under scheduled maintenance. Please check back soon.'),

  // 8. Analytics & SEO
  googleAnalyticsId: text('google_analytics_id'),

  updatedBy: text('updated_by'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export type SiteSetting = typeof siteSettings.$inferSelect;
export type NewSiteSetting = typeof siteSettings.$inferInsert;
