export async function generateMetadata({ params }) {
  const { username, slug } = await params;
  const headline = String(slug || "")
    .replace(/-/g, " ")
    .slice(0, 40)
    .trim();
  return {
    title: headline ? `${headline} by @${username}` : `Article by @${username}`,
    description: `Read an article by @${username} on CampusZen.`,
  };
}

export default function ArticleLayout({ children }) {
  return children;
}
