"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PostComposer } from "@/components/app/PostComposer";
import { EmptyState } from "@/components/app/EmptyState";
import { PenLine, FileText } from "lucide-react";
import { api } from "@/lib/api";

export default function CreatePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    api.me().then((r) => setUser(r.data?.user)).catch(() => {});
  }, []);

  return (
    <div className="mx-auto w-full max-w-[640px] space-y-4">
      <h1 className="text-[18px] font-semibold tracking-[-0.02em]">Create</h1>
      <PostComposer
        user={user}
        onCreated={() => {
          router.push("/app");
          router.refresh();
        }}
      />
      <EmptyState icon={FileText} title="Text + Image • 500 chars" description="Posts can be text, image, or both. Emoji allowed. Images up to 5MB. Posts appear in Following feed newest first." />
      <div className="rounded-[12px] border border-dashed border-[var(--cz-border)] p-3 text-center text-[11px] leading-[15px] text-[var(--cz-text-secondary)]/60">After posting you’ll be redirected to Home feed with card-resize animation.</div>
    </div>
  );
}
