CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`snapshot_id` text NOT NULL,
	`ticker` text NOT NULL,
	`event_type` text NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`impact` integer NOT NULL,
	`event_at` text NOT NULL,
	`source_name` text,
	`source_url` text,
	`verified` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`snapshot_id`) REFERENCES `snapshots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_events_ticker_event_at` ON `events` (`ticker`,`event_at`);--> statement-breakpoint
CREATE TABLE `instruments` (
	`ticker` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`exchange` text,
	`currency` text NOT NULL,
	`instrument_type` text DEFAULT 'equity' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scan_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`run_type` text NOT NULL,
	`schema_version` text NOT NULL,
	`generated_at` text NOT NULL,
	`market` text NOT NULL,
	`market_sentiment` text,
	`market_summary` text,
	`status` text NOT NULL,
	`raw_json` text NOT NULL,
	`error_json` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_scan_runs_generated_at` ON `scan_runs` (`generated_at`);--> statement-breakpoint
CREATE TABLE `snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`scan_run_id` text NOT NULL,
	`ticker` text NOT NULL,
	`price` real,
	`price_change_pct` real,
	`signal` text NOT NULL,
	`score` real NOT NULL,
	`score_change` real,
	`confidence` real NOT NULL,
	`risk` text NOT NULL,
	`thesis_status` text NOT NULL,
	`thesis_summary` text NOT NULL,
	`raw_json` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`scan_run_id`) REFERENCES `scan_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ticker`) REFERENCES `instruments`(`ticker`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_snapshots_scan_ticker` ON `snapshots` (`scan_run_id`,`ticker`);--> statement-breakpoint
CREATE INDEX `idx_snapshots_ticker_created` ON `snapshots` (`ticker`,`created_at`);