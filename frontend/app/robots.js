export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Auth-walled (all noindex via metadata) — keep crawlers on the
      // public pages that are actually in the sitemap.
      disallow: ["/app/", "/admin"],
    },
    sitemap: "https://campuszen.tech/sitemap.xml",
  };
}
