"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PostComposer } from "@/components/app/PostComposer";
import { ArticleComposer } from "@/components/app/ArticleComposer";
import { PageHeader } from "@/components/app/PageHeader";
import { useMe } from "@/lib/hooks/queries";
import { cn } from "@/lib/utils";

export default function CreatePage() {
  const router = useRouter();
  const [mode, setMode] = useState("post");
  // Cached session from the shell — the composer paints without waiting on /me.
  const { data: meData } = useMe();
  const user = meData?.data?.user || null;

  return (
    <div>
      <PageHeader title={mode === "article" ? "New article" : "New post"} />
      <div className="flex gap-2 border-b border-[var(--cz-border)] px-4 py-2">
        {[
          { id: "post", label: "Post" },
          { id: "article", label: "Article · markdown" },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            aria-pressed={mode === m.id}
            className={cn(
              "h-[36px] rounded-full px-4 text-[14px] font-bold transition-colors",
              mode === m.id
                ? "bg-[var(--cz-text-primary)] text-[var(--cz-bg)]"
                : "bg-[var(--cz-surface-strong)] text-[var(--cz-text-secondary)] hover:text-[var(--cz-text-primary)]",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
      {mode === "article" ? (
        <ArticleComposer
          user={user}
          onCreated={(post) => {
            const uname = post?.author?.username || user?.username;
            if (uname && post?.slug) router.push(`/app/a/${uname}/${post.slug}`);
            else router.push("/app");
            router.refresh();
          }}
        />
      ) : (
        <PostComposer
          user={user}
          onCreated={() => {
            router.push("/app");
            router.refresh();
          }}
        />
      )}
      <p className="px-4 py-6 text-center text-[13px] leading-[18px] text-[var(--cz-text-secondary)]">
        {mode === "article"
          ? "Title 120, description 200, body 50k markdown. You get @you/slug — mention it anywhere with ${you/slug} for a rich preview."
          : "Up to 500 characters. Up to 4 photos/GIFs, or 1 video (25MB, 60s). Videos play from a lightweight poster so feeds stay fast. Use @ to mention a student, # for tags, and ${user/slug} to embed an article."}
      </p>
    </div>
  );
}
