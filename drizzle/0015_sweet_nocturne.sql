CREATE TABLE `cash_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`person_name` text,
	`amount_khr` integer DEFAULT 0 NOT NULL,
	`amount_usd` real DEFAULT 0 NOT NULL,
	`note` text,
	`recorded_by` text,
	`created_at` integer
);
