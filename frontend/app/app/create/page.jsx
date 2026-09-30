"use client";

import { useRouter } from "next/navigation";
import { PostComposer } from "@/components/app/PostComposer";
import { PageHeader } from "@/components/app/PageHeader";
import { useMe } from "@/lib/hooks/queries";

export default function CreatePage() {
  const router = useRouter();
  // Cached session from the shell — the composer paints without waiting on /me.
  const { data: meData } = useMe();
  const user = meData?.data?.user || null;

  return (
    <div>
      <PageHeader title="New post" />
      <PostComposer
        user={user}
        onCreated={() => {
          router.push("/app");
          router.refresh();
        }}
      />
      <p className="px-4 py-6 text-center text-[13px] leading-[18px] text-[var(--cz-text-secondary)]">
        Up to 500 characters. Images up to 5MB. Use @ to mention a student and #
        to add a tag.
      </p>
    </div>
  );
}
