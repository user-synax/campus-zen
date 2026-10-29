import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { ParentalConsentForm } from "./ParentalConsentForm";

export const metadata = {
  title: "Guardian consent",
  description:
    "A parent or guardian can approve a CampusZen account for a 13–17 year old.",
  robots: { index: false, follow: false },
};

export default async function ParentalConsentPage({ searchParams }) {
  const params = await searchParams;
  const email = typeof params?.email === "string" ? params.email : "";

  return (
    <Suspense
      fallback={
        <AuthShell title="Guardian consent" subtitle="Loading…">
          <div className="grid h-32 place-items-center text-[13px] text-[var(--cz-text-secondary)]">
            Loading…
          </div>
        </AuthShell>
      }
    >
      <ParentalConsentForm initialEmail={email} />
    </Suspense>
  );
}
