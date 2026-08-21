import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { cmsService, NotFoundError } from "@/lib/services/cms.service";
import { PageEditorForm } from "@/components/cms/PageEditorForm";

interface EditCmsPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEditCmsPage({ params }: EditCmsPageProps) {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/api/auth/signin");
  }

  const { id } = await params;

  try {
    const page = await cmsService.getPageById(id);

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <PageEditorForm initialData={page as any} isEditing={true} />
        </main>
      </div>
    );
  } catch (err: any) {
    if (err instanceof NotFoundError) {
      notFound();
    }
    throw err;
  }
}
