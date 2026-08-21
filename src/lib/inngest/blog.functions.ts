import { inngest } from "@/lib/inngest";
import { db } from "@/lib/db/client";
import { blogPosts } from "@/lib/db/schema";
import { and, eq, lte } from "drizzle-orm";

export const publishScheduledPosts = inngest.createFunction(
  { id: "blog-publish-scheduled", concurrency: 1 },
  { cron: "*/15 * * * *" }, // every 15 minutes
  async ({ step }) => {
    const now = new Date().toISOString();

    // Find all SCHEDULED posts whose scheduledFor has passed
    const duePosts = await step.run("find-due-posts", async () => {
      return db
        .select({ id: blogPosts.id })
        .from(blogPosts)
        .where(
          and(
            eq(blogPosts.status, "SCHEDULED"),
            lte(blogPosts.scheduledFor, now)
          )
        );
    });

    // Publish each one
    await step.run("publish-posts", async () => {
      for (const post of duePosts) {
        await db
          .update(blogPosts)
          .set({ status: "PUBLISHED", publishedAt: now, updatedAt: now })
          .where(eq(blogPosts.id, post.id));
      }
    });

    return { published: duePosts.length };
  }
);
