CREATE TABLE `tip_clicks` (
	`event` text NOT NULL,
	`client` text NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`event`, `client`),
	FOREIGN KEY (`event`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
