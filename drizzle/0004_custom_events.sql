CREATE TABLE IF NOT EXISTS `custom_events` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text,
	`user_id` text,
	`event_name` text NOT NULL,
	`event_category` text,
	`event_label` text,
	`event_value` integer,
	`path` text NOT NULL,
	`metadata` text,
	`created_at` integer
);
