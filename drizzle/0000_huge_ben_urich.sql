CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text,
	`role` text DEFAULT 'user' NOT NULL,
	`avatar_url` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `super_admins` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`can_manage_settings` integer DEFAULT true NOT NULL,
	`can_manage_admins` integer DEFAULT true NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `super_admins_user_id_unique` ON `super_admins` (`user_id`);--> statement-breakpoint
CREATE TABLE `site_settings` (
	`id` text PRIMARY KEY DEFAULT 'default' NOT NULL,
	`site_name` text DEFAULT 'My Site' NOT NULL,
	`site_url` text,
	`telegram_token` text,
	`telegram_group_id` text,
	`telegram_enabled` integer DEFAULT false NOT NULL,
	`resend_api_key` text,
	`mail_from` text,
	`mail_from_name` text DEFAULT 'System Notification',
	`resend_enabled` integer DEFAULT false NOT NULL,
	`notification_token` text,
	`updated_by` text,
	`created_at` integer,
	`updated_at` integer
);
