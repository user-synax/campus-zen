export async function generateMetadata({ params }) {
  const { slug } = await params;
  const name = String(slug || "").replace(/-/g, " ").trim() || "College";
  return {
    title: name,
    description: `Meet students from ${name} and read their posts on CampusZen. Follow your classmates to fill your feed.`,
  };
}

export default function CollegeSlugLayout({ children }) {
  return children;
}
