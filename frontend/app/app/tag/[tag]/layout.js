export async function generateMetadata({ params }) {
  const { tag } = await params;
  return {
    title: `#${tag}`,
    description: `Posts tagged #${tag} on CampusZen.`,
  };
}

export default function TagLayout({ children }) {
  return children;
}
