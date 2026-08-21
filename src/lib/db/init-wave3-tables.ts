import { rawClient } from "./client";

async function initTables() {
  console.log("Applying Wave 3 database tables...");

  await rawClient.execute(`
    CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY NOT NULL,
      code TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      value REAL NOT NULL,
      min_order_value REAL DEFAULT 0,
      max_uses INTEGER,
      used_count INTEGER DEFAULT 0 NOT NULL,
      expires_at TEXT,
      is_active INTEGER DEFAULT 1 NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `);

  await rawClient.execute(`CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);`);

  await rawClient.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY NOT NULL,
      student_id TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING' NOT NULL,
      gateway TEXT NOT NULL,
      gateway_order_id TEXT UNIQUE,
      gateway_payment_id TEXT,
      subtotal REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      total REAL NOT NULL,
      currency TEXT DEFAULT 'INR' NOT NULL,
      coupon_id TEXT,
      invoice_url TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (student_id) REFERENCES users(id),
      FOREIGN KEY (coupon_id) REFERENCES coupons(id)
    );
  `);

  await rawClient.execute(`CREATE INDEX IF NOT EXISTS idx_orders_student ON orders(student_id);`);
  await rawClient.execute(`CREATE INDEX IF NOT EXISTS idx_orders_gateway_order ON orders(gateway_order_id);`);

  await rawClient.execute(`
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY NOT NULL,
      order_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      price_at_purchase REAL NOT NULL,
      created_at TEXT,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id)
    );
  `);

  await rawClient.execute(`CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);`);
  await rawClient.execute(`CREATE INDEX IF NOT EXISTS idx_order_items_course ON order_items(course_id);`);

  // Ensure order_id exists in enrollments
  try {
    await rawClient.execute(`ALTER TABLE enrollments ADD COLUMN order_id TEXT REFERENCES orders(id);`);
  } catch (e: any) {
    // Column might already exist
  }

  await rawClient.execute(`CREATE INDEX IF NOT EXISTS idx_enrollments_order ON enrollments(order_id);`);

  console.log("Wave 3 tables successfully initialized!");
}

initTables()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed to init tables:", err);
    process.exit(1);
  });
