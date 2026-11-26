ALTER TABLE `site_settings` ADD `site_description` text DEFAULT 'Production-ready Fullstack Monorepo Application';--> statement-breakpoint
ALTER TABLE `site_settings` ADD `site_logo_url` text;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `site_favicon_url` text;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `support_email` text;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `allow_registration` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `require_email_verification` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `maintenance_mode` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `maintenance_message` text DEFAULT 'We are currently under scheduled maintenance. Please check back soon.';--> statement-breakpoint
ALTER TABLE `site_settings` ADD `google_analytics_id` text;