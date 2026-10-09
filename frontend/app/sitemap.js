const SITE = "https://campuszen.tech";
const API =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Static, public, indexable routes. Auth-walled /app/*, /admin, and
// one-off utility pages (forgot/reset/verify) are intentionally excluded.
const STATIC_ROUTES = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/u", changeFrequency: "daily", priority: 0.9 },
  { path: "/c", changeFrequency: "daily", priority: 0.9 },
  { path: "/docs", changeFrequency: "monthly", priority: 0.8 },
  { path: "/login", changeFrequency: "monthly", priority: 0.7 },
  { path: "/signup", changeFrequency: "monthly", priority: 0.7 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.5 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.5 },
];

// Paginate a public list endpoint at build time. Any failure (backend
// asleep during build, rate limit, schema drift) falls back to [] so the
// static routes above always survive.
async function fetchSlugs(path, key, idKey, maxPages) {
  const out = [];
  try {
    for (let page = 1; page <= maxPages; page += 1) {
      const res = await fetch(
        `${API}${path}?page=${page}&limit=50`,
        { next: { revalidate: 86400 } },
      );
      if (!res.ok) break;
      const json = await res.json().catch(() => null);
      const data = json?.data ?? json ?? {};
      const rows = Array.isArray(data?.[key]) ? data[key] : [];
      for (const row of rows) {
        const id = String(row?.[idKey] || "").trim();
        if (id) out.push(id);
      }
      if (!data?.hasMore) break;
    }
  } catch {
    // backend unreachable at build time — static routes still ship
  }
  return [...new Set(out)];
}

export default async function sitemap() {
  const now = new Date();

  const [collegeSlugs, usernames] = await Promise.all([
    fetchSlugs("/api/colleges", "colleges", "slug", 5),
    fetchSlugs("/api/users", "users", "username", 10),
  ]);

  return [
    ...STATIC_ROUTES.map((r) => ({
      url: `${SITE}${r.path === "/" ? "" : r.path}`,
      lastModified: now,
      changeFrequency: r.changeFrequency,
      priority: r.priority,
    })),
    ...collegeSlugs.map((slug) => ({
      url: `${SITE}/c/${encodeURIComponent(slug)}`,
      changeFrequency: "weekly",
      priority: 0.7,
    })),
    ...usernames.map((username) => ({
      url: `${SITE}/u/${encodeURIComponent(username)}`,
      changeFrequency: "weekly",
      priority: 0.6,
    })),
  ];
}
