import { db } from "@/lib/db/client";
import { settings } from "@/lib/db/schema/settings";
import { pages } from "@/lib/db/schema/pages";
import { eq, and, asc } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { UpdateSettingsDto } from "@/lib/validations/settings.schema";

export interface NavPageItem {
  slug: string;
  navLabel: string;
  order?: number;
}

export interface SiteSettings {
  siteName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  seoDefaultTitle: string;
  seoDefaultDesc: string;
  seoOgImage: string | null;
  footerText: string;
  social: {
    twitter: string | null;
    linkedin: string | null;
    youtube: string | null;
    instagram: string | null;
  };
  announcement: {
    text: string;
    active: boolean;
  };
  navPages: NavPageItem[];
}

export class SettingsService {
  /**
   * Get all site settings including dynamic navigation pages
   */
  async getAll(): Promise<SiteSettings> {
    const rows = await db.select().from(settings);
    const navPagesRows = await db
      .select({
        slug: pages.slug,
        navLabel: pages.navLabel,
        title: pages.title,
      })
      .from(pages)
      .where(and(eq(pages.status, "PUBLISHED"), eq(pages.inNav, true)))
      .orderBy(asc(pages.navLabel), asc(pages.title));

    const navPages: NavPageItem[] = navPagesRows.map((p, idx) => ({
      slug: p.slug,
      navLabel: p.navLabel || p.title,
      order: idx + 1,
    }));

    return this.deserialize(rows, navPages);
  }

  /**
   * Update site settings (upserts each key-value pair)
   */
  async update(dto: UpdateSettingsDto): Promise<string[]> {
    const entries = this.serialize(dto);
    const updatedKeys: string[] = [];

    const now = new Date().toISOString();

    for (const [key, jsonValue] of entries) {
      await db
        .insert(settings)
        .values({
          key,
          value: jsonValue,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: settings.key,
          set: {
            value: jsonValue,
            updatedAt: now,
          },
        });

      updatedKeys.push(key);
    }

    try {
      revalidateTag("cms-settings");
    } catch (e) {
      // ignore outside request lifecycle
    }

    return updatedKeys;
  }

  private serialize(dto: UpdateSettingsDto): Array<[string, string]> {
    const entries: Array<[string, string]> = [];

    if (dto.siteName !== undefined) {
      entries.push(["site_name", JSON.stringify(dto.siteName)]);
    }
    if (dto.logoUrl !== undefined) {
      entries.push(["logo_url", JSON.stringify(dto.logoUrl || null)]);
    }
    if (dto.faviconUrl !== undefined) {
      entries.push(["favicon_url", JSON.stringify(dto.faviconUrl || null)]);
    }
    if (dto.seoDefaultTitle !== undefined) {
      entries.push(["seo_default_title", JSON.stringify(dto.seoDefaultTitle)]);
    }
    if (dto.seoDefaultDesc !== undefined) {
      entries.push(["seo_default_desc", JSON.stringify(dto.seoDefaultDesc)]);
    }
    if (dto.seoOgImage !== undefined) {
      entries.push(["seo_og_image", JSON.stringify(dto.seoOgImage || null)]);
    }
    if (dto.footerText !== undefined) {
      entries.push(["footer_text", JSON.stringify(dto.footerText)]);
    }

    if (dto.social !== undefined) {
      if (dto.social.twitter !== undefined) {
        entries.push(["social_twitter", JSON.stringify(dto.social.twitter || null)]);
      }
      if (dto.social.linkedin !== undefined) {
        entries.push(["social_linkedin", JSON.stringify(dto.social.linkedin || null)]);
      }
      if (dto.social.youtube !== undefined) {
        entries.push(["social_youtube", JSON.stringify(dto.social.youtube || null)]);
      }
      if (dto.social.instagram !== undefined) {
        entries.push(["social_instagram", JSON.stringify(dto.social.instagram || null)]);
      }
    }

    if (dto.announcement !== undefined) {
      if (dto.announcement.text !== undefined) {
        entries.push(["announcement_text", JSON.stringify(dto.announcement.text)]);
      }
      if (dto.announcement.active !== undefined) {
        entries.push(["announcement_active", JSON.stringify(dto.announcement.active)]);
      }
    }

    return entries;
  }

  private deserialize(
    rows: Array<{ key: string; value: string | null }>,
    navPages: NavPageItem[]
  ): SiteSettings {
    const map: Record<string, any> = {};

    for (const r of rows) {
      try {
        map[r.key] = r.value !== null ? JSON.parse(r.value) : null;
      } catch (e) {
        map[r.key] = r.value;
      }
    }

    return {
      siteName: map["site_name"] ?? "LMS Platform",
      logoUrl: map["logo_url"] ?? null,
      faviconUrl: map["favicon_url"] ?? null,
      seoDefaultTitle: map["seo_default_title"] ?? "LMS Platform — Master Modern Tech",
      seoDefaultDesc:
        map["seo_default_desc"] ??
        "Explore high-quality courses, tutorials, and career roadmaps taught by industry leaders.",
      seoOgImage: map["seo_og_image"] ?? null,
      footerText: map["footer_text"] ?? "© 2026 LMS Platform, Inc. All rights reserved.",
      social: {
        twitter: map["social_twitter"] ?? null,
        linkedin: map["social_linkedin"] ?? null,
        youtube: map["social_youtube"] ?? null,
        instagram: map["social_instagram"] ?? null,
      },
      announcement: {
        text: map["announcement_text"] ?? "🎉 New courses and tutorials added this week!",
        active: Boolean(map["announcement_active"]),
      },
      navPages,
    };
  }
}

export const settingsService = new SettingsService();
