CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`order_number` integer NOT NULL,
	`table_number` text NOT NULL,
	`items` text NOT NULL,
	`subtotal` real NOT NULL,
	`discount` real DEFAULT 0 NOT NULL,
	`total_amount` real NOT NULL,
	`payment_method` text DEFAULT 'cash' NOT NULL,
	`payment_status` text DEFAULT 'paid' NOT NULL,
	`cashier_name` text DEFAULT 'Cashier',
	`note` text,
	`created_at` integer,
	`updated_at` integer
);
