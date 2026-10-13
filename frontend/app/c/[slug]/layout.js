const API =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function fetchCollege(slug) {
  try {
    const res = await fetch(
      `${API}/api/colleges/${encodeURIComponent(slug)}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    return json?.data?.college || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const college = await fetchCollege(slug);
  const name =
    college?.name ||
    String(slug || "")
      .replace(/-/g, " ")
      .trim() ||
    "College";
  const title = name;
  const description =
    college?.memberCount != null
      ? `Meet ${college.memberCount} students from ${name} and read their posts on CampusZen. Follow your classmates to fill your feed.`
      : `Meet students from ${name} and read their posts on CampusZen. Follow your classmates to fill your feed.`;

  return {
    title,
    description,
    alternates: { canonical: `/c/${slug}` },
    openGraph: {
      type: "website",
      url: `/c/${slug}`,
      title,
      description,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default function CollegeSlugLayout({ children }) {
  return children;
}