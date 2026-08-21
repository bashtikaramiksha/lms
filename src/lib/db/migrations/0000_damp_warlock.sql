CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text,
	`full_name` text NOT NULL,
	`avatar_url` text,
	`bio` text,
	`role` text DEFAULT 'STUDENT' NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`email_verified` integer DEFAULT false,
	`email_verify_token` text,
	`email_verify_expires_at` text,
	`reset_password_token` text,
	`reset_password_expires_at` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_role` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `idx_users_status` ON `users` (`status`);--> statement-breakpoint
CREATE INDEX `idx_users_verify_token` ON `users` (`email_verify_token`);--> statement-breakpoint
CREATE INDEX `idx_users_reset_token` ON `users` (`reset_password_token`);--> statement-breakpoint
CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	`created_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_accounts_user_id` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_accounts_provider` ON `accounts` (`provider`,`provider_account_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_token` text NOT NULL,
	`user_id` text NOT NULL,
	`expires` text NOT NULL,
	`created_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_session_token_unique` ON `sessions` (`session_token`);--> statement-breakpoint
CREATE INDEX `idx_sessions_token` ON `sessions` (`session_token`);--> statement-breakpoint
CREATE INDEX `idx_sessions_user_id` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `verification_tokens` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` text NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_id` text NOT NULL,
	`action` text NOT NULL,
	`target_user_id` text NOT NULL,
	`details` text,
	`ip_address` text,
	`created_at` text,
	FOREIGN KEY (`admin_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_audit_logs_admin_id` ON `audit_logs` (`admin_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_target_user_id` ON `audit_logs` (`target_user_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_action` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_created_at` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`created_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_categories_slug` ON `categories` (`slug`);--> statement-breakpoint
CREATE TABLE `courses` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`short_desc` text,
	`thumbnail_url` text,
	`preview_url` text,
	`type` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`level` text,
	`language` text DEFAULT 'English',
	`price` real DEFAULT 0,
	`discount_price` real,
	`access_duration` integer,
	`author_id` text NOT NULL,
	`category_id` text,
	`is_featured` integer DEFAULT false,
	`seo_title` text,
	`seo_description` text,
	`og_image_url` text,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `courses_slug_unique` ON `courses` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_courses_slug` ON `courses` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_courses_status` ON `courses` (`status`);--> statement-breakpoint
CREATE INDEX `idx_courses_author` ON `courses` (`author_id`);--> statement-breakpoint
CREATE INDEX `idx_courses_category` ON `courses` (`category_id`);--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` text PRIMARY KEY NOT NULL,
	`module_id` text NOT NULL,
	`title` text NOT NULL,
	`type` text NOT NULL,
	`order` integer NOT NULL,
	`video_url` text,
	`duration` integer,
	`content` text,
	`is_preview` integer DEFAULT false,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_lessons_module` ON `lessons` (`module_id`);--> statement-breakpoint
CREATE TABLE `modules` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`title` text NOT NULL,
	`order` integer NOT NULL,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_modules_course` ON `modules` (`course_id`);--> statement-breakpoint
CREATE TABLE `enrollments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`course_id` text NOT NULL,
	`order_id` text,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`enrolled_at` text,
	`expires_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_enrollments_user` ON `enrollments` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_enrollments_course` ON `enrollments` (`course_id`);--> statement-breakpoint
CREATE INDEX `idx_enrollments_order` ON `enrollments` (`order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_enrollments_user_course` ON `enrollments` (`user_id`,`course_id`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`student_id` text NOT NULL,
	`rating` integer NOT NULL,
	`comment` text,
	`created_at` text,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_reviews_course` ON `reviews` (`course_id`);--> statement-breakpoint
CREATE INDEX `idx_reviews_student` ON `reviews` (`student_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reviews_course_student` ON `reviews` (`course_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `cart_items` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`course_id` text NOT NULL,
	`added_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_cart_user_course` ON `cart_items` (`user_id`,`course_id`);--> statement-breakpoint
CREATE INDEX `idx_cart_user` ON `cart_items` (`user_id`);--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`type` text NOT NULL,
	`value` real NOT NULL,
	`min_order_value` real DEFAULT 0,
	`max_uses` integer,
	`used_count` integer DEFAULT 0 NOT NULL,
	`expires_at` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coupons_code_unique` ON `coupons` (`code`);--> statement-breakpoint
CREATE INDEX `idx_coupons_code` ON `coupons` (`code`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`course_id` text NOT NULL,
	`price_at_purchase` real NOT NULL,
	`created_at` text,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_order_items_order` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_order_items_course` ON `order_items` (`course_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`gateway` text NOT NULL,
	`gateway_order_id` text,
	`gateway_payment_id` text,
	`subtotal` real NOT NULL,
	`discount_amount` real DEFAULT 0,
	`total` real NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`coupon_id` text,
	`invoice_url` text,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_gateway_order_id_unique` ON `orders` (`gateway_order_id`);--> statement-breakpoint
CREATE INDEX `idx_orders_student` ON `orders` (`student_id`);--> statement-breakpoint
CREATE INDEX `idx_orders_gateway_order` ON `orders` (`gateway_order_id`);