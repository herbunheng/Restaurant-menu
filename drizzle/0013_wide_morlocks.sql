CREATE TABLE `restaurant_tables` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`zone` text,
	`capacity` integer DEFAULT 4 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
