CREATE TABLE `company_fundamentals_cache` (
	`ticker` text PRIMARY KEY NOT NULL,
	`cik` text,
	`status` text NOT NULL,
	`data_json` text,
	`last_error` text,
	`fetched_at` text NOT NULL
);
