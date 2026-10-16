"use client";

import { Loader2, FileText } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { ArticleEditor } from "@/components/app/ArticleEditor";
import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { useMe, usePost } from "@/lib/hooks/queries";
import { articleUrl } from "@/lib/articles";

export default function EditArticlePage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: meData } = useMe();
  const me = meData?.data?.user || null;
  const { data, isPending, error } = usePost(id);
  const post = data?.data?.post || null;

  if (isPending) {
    return (
      <div>
        <PageHeader href="/app" title="Edit article" />
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--cz-text-secondary)]" aria-label="Loading article" />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div>
        <PageHeader href="/app" title="Edit article" />
        <EmptyState
          icon={FileText}
          title="Article not found"
          description={error?.data?.message || error?.message || "This article may have been deleted."}
          actionLabel="Back to feed"
          actionHref="/app"
        />
      </div>
    );
  }

  if (post.kind === "article" && post.isAnonymous) {
    return (
      <div>
        <PageHeader href="/app" title="Edit article" />
        <EmptyState
          icon={FileText}
          title="Can't edit this article"
          description="Anonymous articles can't be edited."
          actionLabel="Back to feed"
          actionHref="/app"
        />
      </div>
    );
  }

  if (post.kind !== "article") {
    return (
      <div>
        <PageHeader href="/app" title="Edit article" />
        <EmptyState
          icon={FileText}
          title="Not an article"
          description="Only articles can be edited here. Use the post card to edit short posts."
          actionLabel="Back to feed"
          actionHref="/app"
        />
      </div>
    );
  }

  const isOwn = me && String(me._id) === String(post.author?._id || post.author);
  if (meData && !isOwn) {
    return (
      <div>
        <PageHeader href="/app" title="Edit article" />
        <EmptyState
          icon={FileText}
          title="Not your article"
          description="You can only edit articles you wrote."
          actionLabel="Back to feed"
          actionHref="/app"
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader href={articleUrl(post.author?.username, post.slug)} title="Edit article" />
      <ArticleEditor
        post={post}
        onSaved={(updated) => {
          const uname = updated?.author?.username || post.author?.username;
          const slug = updated?.slug || post.slug;
          router.push(articleUrl(uname, slug));
          router.refresh();
        }}
      />
    </div>
  );
}
