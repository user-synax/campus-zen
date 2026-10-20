import { shareMetadata } from "@/lib/share";
import { getArticleForShare } from "@/lib/share-server";

export async function generateMetadata({ params }) {
  const { username, slug } = await params;
  const post = await getArticleForShare(username, slug);

  if (!post) {
    const headline = String(slug || "")
      .replace(/-/g, " ")
      .slice(0, 40)
      .trim();
    return {
      title: headline
        ? `${headline} by @${username}`
        : `Article by @${username}`,
      description: `Read an article by @${username} on CampusZen. Log in to reply and share it with your followers.`,
    };
  }

  return shareMetadata(
    post,
    `/app/a/${post.author?.username || username}/${post.slug || slug}`,
  );
}

export default function ArticleLayout({ children }) {
  return children;
}
