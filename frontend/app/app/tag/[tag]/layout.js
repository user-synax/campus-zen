export async function generateMetadata({ params }) {
  const { tag } = await params;
  return {
    title: `#${tag}`,
    description: `Posts tagged #${tag} on CampusZen, newest first. Log in to post with this hashtag.`,
  };
}

export default function TagLayout({ children }) {
  return children;
}
