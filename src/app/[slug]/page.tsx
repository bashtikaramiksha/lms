import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, ArrowRight } from "lucide-react";
import { cmsService } from "@/lib/services/cms.service";
import { BlockRenderer } from "@/components/cms/BlockRenderer/BlockRenderer";

export const revalidate = 300; // ISR cache 300s
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const slugs = await cmsService.getPublishedPageSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch (err) {
    console.warn("generateStaticParams fallback for cms:", err);
    return [];
  }
}

interface PublicCmsPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PublicCmsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await cmsService.getPublicPage(slug);

  if (!page) {
    return {
      title: "Page Not Found — LMS Platform",
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lms-platform.com";
  const title = page.seo.seoTitle || `${page.title} — LMS Platform`;
  const description = page.seo.seoDesc || `${page.title} static page on LMS Platform`;
  const canonicalUrl = `${siteUrl}/${page.slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      images: page.seo.ogImageUrl
        ? [{ url: page.seo.ogImageUrl, alt: page.title }]
        : undefined,
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function DynamicCmsPage({ params }: PublicCmsPageProps) {
  const { slug } = await params;
  const page = await cmsService.getPublicPage(slug);

  if (!page) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Public Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              LMS Platform
            </span>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-4 text-xs font-semibold">
            <Link
              href="/courses"
              className="text-slate-400 hover:text-white transition-colors px-3 py-2"
            >
              Browse Courses
            </Link>
            <Link
              href="/blog"
              className="text-slate-400 hover:text-white transition-colors px-3 py-2"
            >
              Blog
            </Link>
            <Link
              href="/login"
              className="text-slate-400 hover:text-white transition-colors px-3 py-2"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1"
            >
              Get Started <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Main CMS Page Blocks */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        {page.blocks && page.blocks.length > 0 ? (
          page.blocks.map((block) => (
            <BlockRenderer key={block.id} block={block} />
          ))
        ) : (
          <div className="text-center py-20 text-slate-500">
            <h1 className="text-3xl font-bold text-white mb-2">{page.title}</h1>
            <p className="text-sm">This page has no content blocks yet.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 LMS Platform, Inc. All rights reserved.</p>
          <div className="flex items-center gap-4 text-slate-400 font-medium">
            <Link href="/courses" className="hover:text-white transition-colors">Courses</Link>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
            <Link href="/teacher/dashboard" className="hover:text-white transition-colors">Teacher Studio</Link>
            <Link href="/admin/dashboard" className="hover:text-white transition-colors">Admin Console</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
