CREATE TABLE `staff` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`gender` text DEFAULT 'male' NOT NULL,
	`role` text DEFAULT 'waiter' NOT NULL,
	`telegram` text,
	`phone` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
