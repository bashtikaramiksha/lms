import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageEditorForm } from "@/components/cms/PageEditorForm";

export default async function AdminNewCmsPage() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/api/auth/signin");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <PageEditorForm isEditing={false} />
      </main>
    </div>
  );
}
