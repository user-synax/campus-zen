export async function generateMetadata({ params }) {
  const { username } = await params;
  return {
    title: `@${username}`,
    description: `View @${username}'s posts and activity on CampusZen. Follow them to see more in your feed.`,
  };
}

export default function ProfileUserLayout({ children }) {
  return children;
}
