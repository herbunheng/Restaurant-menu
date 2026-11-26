CREATE TABLE `visitor_analytics` (
	`id` text PRIMARY KEY NOT NULL,
	`path` text NOT NULL,
	`domain` text,
	`referrer` text,
	`ip_address` text,
	`country` text,
	`region` text,
	`city` text,
	`timezone` text,
	`isp` text,
	`device` text DEFAULT 'unknown',
	`os` text,
	`browser` text,
	`user_agent` text,
	`created_at` integer
);
