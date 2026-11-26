CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text,
	`user_id` text,
	`user_email` text,
	`user_role` text,
	`ip_address` text,
	`user_agent` text,
	`details` text,
	`status` text DEFAULT 'SUCCESS' NOT NULL,
	`created_at` integer
);
