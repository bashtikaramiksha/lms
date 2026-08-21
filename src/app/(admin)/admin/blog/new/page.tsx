import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { blogCategories, blogTags } from "@/lib/db/schema";
import { PostEditorForm } from "@/components/blog/PostEditorForm";

export default async function AdminNewBlogPostPage() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/api/auth/signin");
  }

  const [categories, tags] = await Promise.all([
    db.query.blogCategories.findMany({
      orderBy: [blogCategories.name],
    }),
    db.query.blogTags.findMany({
      orderBy: [blogTags.name],
    }),
  ]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PostEditorForm
          categories={categories}
          availableTags={tags}
          baseRoute="/admin/blog"
          isEdit={false}
        />
      </div>
    </div>
  );
}
