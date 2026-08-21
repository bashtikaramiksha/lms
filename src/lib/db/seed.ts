import { db } from "./client";
import { users, categories } from "./schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

export const DEFAULT_CATEGORIES = [
  { name: "Web Development", slug: "web-development" },
  { name: "Data Science & AI", slug: "data-science-ai" },
  { name: "Mobile Development", slug: "mobile-development" },
  { name: "Cloud & DevOps", slug: "cloud-devops" },
  { name: "Design & UI/UX", slug: "design-ui-ux" },
  { name: "Cybersecurity", slug: "cybersecurity" },
  { name: "Business & Leadership", slug: "business-leadership" },
];

export async function seed() {
  console.log("🌱 Seeding database...");

  const adminEmail = "admin@lms.local";
  const existingAdmin = await db.query.users.findFirst({
    where: eq(users.email, adminEmail),
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("AdminPass123!", 12);
    await db.insert(users).values({
      email: adminEmail,
      fullName: "Super Admin",
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: true,
    });
    console.log("✅ Seeded default Superadmin user: admin@lms.local / AdminPass123!");
  } else {
    console.log("ℹ️ Default Superadmin user already exists.");
  }

  const studentEmail = "student@lms.local";
  const existingStudent = await db.query.users.findFirst({
    where: eq(users.email, studentEmail),
  });

  if (!existingStudent) {
    const studentPassHash = await bcrypt.hash("StudentPass123!", 12);
    await db.insert(users).values({
      email: studentEmail,
      fullName: "Alex Student",
      passwordHash: studentPassHash,
      role: "STUDENT",
      status: "ACTIVE",
      emailVerified: true,
    });
    console.log("✅ Seeded default Student user: student@lms.local / StudentPass123!");
  }

  const teacherEmail = "teacher@lms.local";
  const existingTeacher = await db.query.users.findFirst({
    where: eq(users.email, teacherEmail),
  });

  if (!existingTeacher) {
    const teacherPassHash = await bcrypt.hash("TeacherPass123!", 12);
    await db.insert(users).values({
      email: teacherEmail,
      fullName: "Sarah Connor (Instructor)",
      passwordHash: teacherPassHash,
      role: "TEACHER",
      status: "ACTIVE",
      emailVerified: true,
    });
    console.log("✅ Seeded default Teacher user: teacher@lms.local / TeacherPass123!");
  }

  // Seed Categories
  for (const cat of DEFAULT_CATEGORIES) {
    const existingCat = await db.query.categories.findFirst({
      where: eq(categories.slug, cat.slug),
    });
    if (!existingCat) {
      await db.insert(categories).values(cat);
      console.log(`✅ Seeded category: ${cat.name}`);
    }
  }
}

// Run directly if called from node/cli
if (require.main === module) {
  seed()
    .then(() => {
      console.log("🌱 Seeding complete.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Seeding failed:", err);
      process.exit(1);
    });
}
