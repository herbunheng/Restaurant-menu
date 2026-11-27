-- =========================================================
-- DATABASE SEED DATA FOR CLOUDFLARE D1 (DEV & STAGING)
-- =========================================================

-- 1. SEED USERS TABLE
-- Passwords:
-- manager@admin.com -> UserPassword123!
-- john@example.com -> UserPassword123!
-- alice@example.com -> UserPassword123!
-- bob@example.com -> UserPassword123!
-- Note: Super Admin is managed and authenticated dynamically via .env credentials.

INSERT OR REPLACE INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `avatar_url`, `status`, `created_at`, `updated_at`) VALUES
('usr_admin_01', 'Jane Manager', 'manager@admin.com', '3103fa4cfe1e3deeb2d9f74ce789a8c25456a2a890e30475ad5d9f37d37352c5', 'admin', 'https://api.dicebear.com/7.x/avataaars/svg?seed=JaneManager', 'active', strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('usr_user_01', 'John Doe', 'john@example.com', '3103fa4cfe1e3deeb2d9f74ce789a8c25456a2a890e30475ad5d9f37d37352c5', 'user', 'https://api.dicebear.com/7.x/avataaars/svg?seed=JohnDoe', 'active', strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('usr_user_02', 'Alice Smith', 'alice@example.com', '3103fa4cfe1e3deeb2d9f74ce789a8c25456a2a890e30475ad5d9f37d37352c5', 'user', 'https://api.dicebear.com/7.x/avataaars/svg?seed=AliceSmith', 'active', strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('usr_user_03', 'Bob Johnson', 'bob@example.com', '3103fa4cfe1e3deeb2d9f74ce789a8c25456a2a890e30475ad5d9f37d37352c5', 'user', 'https://api.dicebear.com/7.x/avataaars/svg?seed=BobJohnson', 'suspended', strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- 2. SEED SUPER_ADMINS TABLE
-- (Empty by default: Super Admin authenticated via .env)

-- 3. SEED SITE_SETTINGS TABLE
INSERT OR REPLACE INTO `site_settings` (`id`, `site_name`, `site_description`, `site_url`, `site_logo_url`, `site_favicon_url`, `support_email`, `allow_registration`, `require_email_verification`, `maintenance_mode`, `maintenance_message`, `updated_by`, `created_at`, `updated_at`) VALUES
('default', 'Nuxt Cloudflare SaaS Platform', 'Production-ready fullstack monorepo web application powered by Nuxt 3 and Cloudflare D1.', 'http://localhost:3000', '/logo.svg', '/favicon.ico', 'support@yourdomain.com', 1, 0, 0, 'We are currently performing scheduled maintenance. Please try again shortly.', NULL, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- 4. SEED AUDIT_LOGS TABLE
INSERT OR REPLACE INTO `audit_logs` (`id`, `action`, `entity`, `entity_id`, `user_id`, `user_email`, `user_role`, `ip_address`, `user_agent`, `details`, `status`, `created_at`) VALUES
('log_001', 'SYSTEM_INIT', 'system', 'sys_001', 'system', 'admin@yourdomain.com', 'super_admin', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Initial seed data and system schema deployed', 'SUCCESS', strftime('%s', 'now') * 1000 - 86400000),
('log_002', 'LOGIN_SUCCESS', 'auth', 'sys_001', 'system', 'admin@yourdomain.com', 'super_admin', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Super Admin logged in successfully', 'SUCCESS', strftime('%s', 'now') * 1000 - 43200000),
('log_003', 'UPDATE_SETTING', 'site_settings', 'default', 'system', 'admin@yourdomain.com', 'super_admin', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Updated site configuration branding and support email', 'SUCCESS', strftime('%s', 'now') * 1000 - 21600000);

-- 7. SEED CATEGORIES TABLE
INSERT OR REPLACE INTO `categories` (`id`, `name`, `description`, `sort_order`, `created_at`) VALUES
('cat_main', 'Main Course (ម្ហូបកុម្ម៉ង់)', 'Signature authentic Khmer and Asian main dishes', 1, strftime('%s', 'now') * 1000),
('cat_soup', 'Soups & Curries (ស៊ុប & សម្ល)', 'Traditional aromatic soups and coconut curries', 2, strftime('%s', 'now') * 1000),
('cat_drinks', 'Beverages (ភេសជ្ជៈ)', 'Fresh juices, smoothies, and authentic Khmer coffees', 3, strftime('%s', 'now') * 1000),
('cat_desserts', 'Desserts (បង្អែម)', 'Traditional Khmer sweet desserts and tropical fruits', 4, strftime('%s', 'now') * 1000);

-- 8. SEED MENU_ITEMS TABLE
INSERT OR REPLACE INTO `menu_items` (`id`, `name`, `category_id`, `price`, `currency`, `image_url`, `description`, `is_available`, `created_at`, `updated_at`) VALUES
('item_01', 'Beef Lok Lak (ឡុកឡាក់សាច់គោ)', 'cat_main', 6.5, 'USD', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80', 'Tender stir-fried beef served with fresh lettuce, tomatoes, cucumbers, and black pepper lime dipping sauce.', 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('item_02', 'Fish Amok (អាម៉ុកត្រី)', 'cat_soup', 5.5, 'USD', 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80', 'Traditional Khmer steamed fish curry in banana leaf with coconut milk and kroeung paste.', 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('item_03', 'Khmer Iced Coffee with Milk (កាហ្វេទឹកដោះគោទឹកកក)', 'cat_drinks', 2.0, 'USD', 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80', 'Rich dark drip coffee brewed with sweetened condensed milk and served over crushed ice.', 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
('item_04', 'Mango Sticky Rice (បាយដំណើបស្វាយ)', 'cat_desserts', 3.5, 'USD', 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80', 'Sweet sticky coconut rice served with ripe sweet mango slices and toasted sesame seeds.', 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);


