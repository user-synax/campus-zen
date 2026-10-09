export async function generateMetadata({ params }) {
  const { username } = await params;
  return {
    title: `@${username}`,
    description: `View @${username} on CampusZen.`,
  };
}

export default function ProfileUserLayout({ children }) {
  return children;
}
