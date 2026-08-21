import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lms-platform.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/teacher/",
          "/dashboard/",
          "/checkout/",
          "/login",
          "/register",
          "/pending-approval",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
