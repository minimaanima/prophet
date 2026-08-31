CREATE TABLE `market_quote_attempts` (
	`ticker` text PRIMARY KEY NOT NULL,
	`refresh_slot` text NOT NULL,
	`last_error` text,
	`attempted_at` text NOT NULL
);
