import { rawClient } from "./client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function initWave5Tables() {
  console.log("Applying Wave 5 database tables (Blog & Categories)...");

  // 1. blog_categories table
  await rawClient.execute(`
    CREATE TABLE IF NOT EXISTS blog_categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      created_at TEXT
    );
  `);
  await rawClient.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_categories_slug ON blog_categories(slug);`);

  // 2. blog_tags table
  await rawClient.execute(`
    CREATE TABLE IF NOT EXISTS blog_tags (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE
    );
  `);
  await rawClient.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_tags_slug ON blog_tags(slug);`);

  // 3. blog_posts table
  await rawClient.execute(`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      excerpt TEXT,
      content TEXT,
      featured_image TEXT,
      category_id TEXT,
      author_id TEXT NOT NULL,
      status TEXT DEFAULT 'DRAFT' NOT NULL,
      scheduled_for TEXT,
      seo_title TEXT,
      seo_description TEXT,
      og_image_url TEXT,
      canonical_url TEXT,
      published_at TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (category_id) REFERENCES blog_categories(id) ON DELETE SET NULL,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  await rawClient.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);`);
  await rawClient.execute(`CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON blog_posts(author_id);`);
  await rawClient.execute(`CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category_id);`);
  await rawClient.execute(`CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);`);
  await rawClient.execute(`CREATE INDEX IF NOT EXISTS idx_blog_posts_scheduled_for ON blog_posts(scheduled_for);`);
  await rawClient.execute(`CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at);`);

  // 4. blog_post_tags join table
  await rawClient.execute(`
    CREATE TABLE IF NOT EXISTS blog_post_tags (
      post_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (post_id, tag_id),
      FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES blog_tags(id) ON DELETE CASCADE
    );
  `);
  await rawClient.execute(`CREATE INDEX IF NOT EXISTS idx_blog_post_tags_post ON blog_post_tags(post_id);`);
  await rawClient.execute(`CREATE INDEX IF NOT EXISTS idx_blog_post_tags_tag ON blog_post_tags(tag_id);`);

  // 5. pages table (CMS Static Pages)
  await rawClient.execute(`
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      blocks TEXT,
      status TEXT DEFAULT 'DRAFT' NOT NULL,
      in_nav INTEGER DEFAULT 0,
      nav_label TEXT,
      seo_title TEXT,
      seo_description TEXT,
      og_image_url TEXT,
      created_at TEXT,
      updated_at TEXT
    );
  `);
  await rawClient.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);`);
  await rawClient.execute(`CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(status);`);

  // 6. settings table (Global Site Settings)
  await rawClient.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT,
      updated_at TEXT
    );
  `);

  // Seed default settings rows if not present
  const defaultSettings = [
    ["site_name", '"LMS Platform"'],
    ["logo_url", "null"],
    ["favicon_url", "null"],
    ["seo_default_title", '"LMS Platform — Master Modern Tech"'],
    ["seo_default_desc", '"Explore high-quality courses, tutorials, and career roadmaps taught by industry leaders."'],
    ["seo_og_image", "null"],
    ["footer_text", '"© 2026 LMS Platform, Inc. All rights reserved."'],
    ["social_twitter", "null"],
    ["social_linkedin", "null"],
    ["social_youtube", "null"],
    ["social_instagram", "null"],
    ["announcement_text", '"🎉 New masterclasses and engineering articles published this week!"'],
    ["announcement_active", "false"],
  ];

  for (const [key, value] of defaultSettings) {
    await rawClient.execute({
      sql: `INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`,
      args: [key, value, new Date().toISOString()],
    });
  }

  console.log("Wave 5 tables successfully initialized!");
}

initWave5Tables()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed to init Wave 5 tables:", err);
    process.exit(1);
  });
