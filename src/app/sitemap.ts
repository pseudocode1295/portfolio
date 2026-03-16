import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://ajaykumar1295.dev";

  const staticPages = [
    "",
    "/about",
    "/experience",
    "/projects",
    "/skills",
    "/blog",
    "/resume",
    "/contact",
  ];

  const blogSlugs = [
    "xgboost-to-dml",
    "multi-agent-mcp",
    "nl-to-sql-security",
  ];

  return [
    ...staticPages.map((path) => ({
      url: `${baseUrl}${path}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: path === "" ? 1 : 0.8,
    })),
    ...blogSlugs.map((slug) => ({
      url: `${baseUrl}/blog/${slug}`,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
