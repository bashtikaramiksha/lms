import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LessonPlayerPage } from "@/components/dashboard/LessonPlayerPage";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { courseId, lessonId } = await params;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <LessonPlayerPage courseId={courseId} lessonId={lessonId} />
      </main>
    </div>
  );
}
