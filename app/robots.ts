import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://horeb.lynxems.com.br";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/ebooks/"],
        disallow: ["/admin", "/api/", "/select-church"],
      },
      {
        userAgent: [
          "GPTBot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "PerplexityBot",
          "ClaudeBot",
          "anthropic-ai",
          "Google-Extended",
          "Googlebot",
          "Bingbot",
        ],
        allow: ["/", "/ebooks/", "/llms.txt"],
        disallow: ["/admin", "/api/", "/select-church"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}

