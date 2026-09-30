"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PostComposer } from "@/components/app/PostComposer";
import { PageHeader } from "@/components/app/PageHeader";
import { api } from "@/lib/api";

export default function CreatePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    api.me().then((r) => setUser(r.data?.user)).catch(() => {});
  }, []);

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
