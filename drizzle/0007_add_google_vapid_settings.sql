ALTER TABLE `site_settings` ADD `vapid_public_key` text;
ALTER TABLE `site_settings` ADD `google_client_id` text;
ALTER TABLE `site_settings` ADD `google_client_secret` text;
ALTER TABLE `site_settings` ADD `google_auth_enabled` integer DEFAULT 0 NOT NULL;
