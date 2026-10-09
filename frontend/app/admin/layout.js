export const metadata = {
  title: "Admin",
  description:
    "Restricted admin area for CampusZen moderation. Sign in with admin credentials to review reports and manage content.",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }) {
  return children;
}
