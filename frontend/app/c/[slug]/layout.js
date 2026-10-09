export async function generateMetadata({ params }) {
  const { slug } = await params;
  const name = String(slug || "").replace(/-/g, " ").trim() || "College";
  return {
    title: name,
    description: `Students and posts from ${name} on CampusZen.`,
  };
}

export default function CollegeSlugLayout({ children }) {
  return children;
}
