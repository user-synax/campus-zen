import { Bell } from "lucide-react";
import { EmptyState } from "@/components/app/EmptyState";

export default function NotificationsPage() {
  return (
    <div className="mx-auto w-full max-w-[640px] space-y-4">
      <h1 className="text-[18px] font-semibold tracking-[-0.02em]">Notifications</h1>

      <EmptyState
        icon={Bell}
        title="No notifications yet"
        description="You’ll get notified when someone follows you, likes, replies or reposts your post. Pull, not push, for MVP (no WebSocket)."
      />

      <div className="rounded-[12px] border border-[var(--cz-border)] bg-[rgba(255,255,255,0.02)] p-4">
        <h3 className="text-[13px] font-medium">How it works</h3>
        <ul className="mt-2 list-disc pl-5 space-y-1 text-[12px] leading-[16px] text-[var(--cz-text-secondary)] marker:text-[var(--cz-muted)]">
          <li>New follower → notification</li>
          <li>Like / reply / repost → notification</li>
          <li>GET /api/notifications + PATCH /:id/read</li>
        </ul>
      </div>
    </div>
  );
}
