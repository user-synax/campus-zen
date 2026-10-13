const API =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function fetchUser(username) {
  try {
    const res = await fetch(
      `${API}/api/users/${encodeURIComponent(username)}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    return json?.data?.user || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { username } = await params;
  const user = await fetchUser(username);
  const name = user?.fullName || username;
  const title = `${name} (@${username})`;
  const description =
    user?.bio ||
    `View @${username}'s posts, articles and activity on CampusZen. Follow them to see more in your feed.`;

  return {
    title,
    description,
    alternates: { canonical: `/u/${username}` },
    openGraph: {
      type: "profile",
      url: `/u/${username}`,
      title,
      description,
      images: user?.avatarUrl ? [{ url: user.avatarUrl }] : undefined,
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: user?.avatarUrl ? [user.avatarUrl] : undefined,
    },
  };
}

export default function PublicProfileLayout({ children }) {
  return children;
}