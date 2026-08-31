CREATE TABLE `market_quotes` (
	`ticker` text PRIMARY KEY NOT NULL,
	`price` real NOT NULL,
	`previous_close` real,
	`change` real,
	`change_pct` real,
	`currency` text,
	`price_timestamp` text,
	`is_market_open` integer,
	`refresh_slot` text NOT NULL,
	`fetched_at` text NOT NULL
);
