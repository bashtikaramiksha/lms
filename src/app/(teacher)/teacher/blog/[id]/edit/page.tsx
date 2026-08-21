import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { blogPosts, blogCategories, blogTags } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PostEditorForm } from "@/components/blog/PostEditorForm";

export default async function TeacherEditBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/teacher/blog");
  }

  const userRole = (session.user as any)?.role;
  if (userRole === "STUDENT") {
    redirect("/dashboard");
  }

  const { id } = await params;

  const post = await db.query.blogPosts.findFirst({
    where: eq(blogPosts.id, id),
    with: {
      category: true,
      tags: {
        with: {
          tag: true,
        },
      },
    },
  });

  if (!post) {
    notFound();
  }

  if (post.authorId !== session.user.id && userRole !== "ADMIN") {
    redirect("/teacher/blog");
  }

  const [categories, tags] = await Promise.all([
    db.query.blogCategories.findMany({
      orderBy: [blogCategories.name],
    }),
    db.query.blogTags.findMany({
      orderBy: [blogTags.name],
    }),
  ]);

  const initialData = {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt || "",
    content: post.content || "",
    featuredImage: post.featuredImage || "",
    categoryId: post.categoryId || "",
    tagIds: post.tags.map((t) => t.tagId),
    status: post.status as "DRAFT" | "PUBLISHED" | "SCHEDULED",
    scheduledFor: post.scheduledFor || "",
    seoTitle: post.seoTitle || "",
    seoDesc: post.seoDesc || "",
    ogImageUrl: post.ogImageUrl || "",
    canonicalUrl: post.canonicalUrl || "",
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PostEditorForm
          initialData={initialData}
          categories={categories}
          availableTags={tags}
          baseRoute="/teacher/blog"
          isEdit={true}
        />
      </div>
    </div>
  );
}
