import { notFound } from "next/navigation";
import { SECTIONS } from "../sections";
import { MenuSection } from "./MenuSection";

// Only the nine registered sections exist — /app/menu/anything-else 404s
// instead of rendering an empty settings shell.
export const dynamicParams = false;

export function generateStaticParams() {
  return SECTIONS.map(({ id }) => ({ section: id }));
}

export async function generateMetadata({ params }) {
  const { section } = await params;
  const meta = SECTIONS.find((s) => s.id === section);
  return {
    title: meta ? meta.title : "Settings",
    // Same standing as /app itself: never indexed.
    robots: { index: false, follow: false },
  };
}

export default async function SettingsSectionPage({ params }) {
  const { section } = await params;
  const meta = SECTIONS.find((s) => s.id === section);
  if (!meta) notFound();

  // Only the plain id crosses the server→client boundary; MenuSection reads
  // the rest (including the Lucide icon) from the registry itself.
  return <MenuSection id={meta.id} />;
}
