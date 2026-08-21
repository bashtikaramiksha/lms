import { rawClient } from "./client";

/**
 * Initializes the FTS5 virtual table for full-text search across courses.
 */
export async function initFtsTable(): Promise<void> {
  try {
    await rawClient.execute(`
      CREATE VIRTUAL TABLE IF NOT EXISTS courses_fts USING fts5(
        course_id UNINDEXED,
        title,
        description,
        short_desc
      );
    `);
  } catch (err) {
    console.warn("FTS table initialization warning:", err);
  }
}

/**
 * Inserts or updates a course in the full-text search table.
 */
export async function upsertCourseFts(
  courseId: string,
  title?: string | null,
  description?: string | null,
  shortDesc?: string | null
): Promise<void> {
  try {
    await initFtsTable();
    // Delete existing entry if present
    await rawClient.execute({
      sql: `DELETE FROM courses_fts WHERE course_id = ?`,
      args: [courseId],
    });

    // Insert updated course record
    await rawClient.execute({
      sql: `INSERT INTO courses_fts(course_id, title, description, short_desc) VALUES (?, ?, ?, ?)`,
      args: [
        courseId,
        title || "",
        description || "",
        shortDesc || "",
      ],
    });
  } catch (err) {
    console.warn(`Failed to upsert course ${courseId} into FTS index:`, err);
  }
}

/**
 * Removes a course from the full-text search table upon archiving or deletion.
 */
export async function removeCourseFts(courseId: string): Promise<void> {
  try {
    await initFtsTable();
    await rawClient.execute({
      sql: `DELETE FROM courses_fts WHERE course_id = ?`,
      args: [courseId],
    });
  } catch (err) {
    console.warn(`Failed to remove course ${courseId} from FTS index:`, err);
  }
}
