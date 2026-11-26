CREATE TABLE `payment_methods` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`account_name` text,
	`account_number` text,
	`qr_image_url` text,
	`is_enabled` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`description` text,
	`created_at` integer,
	`updated_at` integer
);
