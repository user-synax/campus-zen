"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * Centered premium toaster (bottom-center per product choice).
 * Dark blurred pill, stacked, 14px radius — matches CampusZen elevated surface.
 */
export function CzToaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      offset={24}
      gap={8}
      visibleToasts={3}
      closeButton
      richColors={false}
      toastOptions={{
        unstyled: false,
        style: {
          borderRadius: 14,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        },
        classNames: {
          toast:
            "!bg-zinc-900/92 !text-white !border !border-white/10 shadow-[0_16px_48px_-8px_rgba(0,0,0,0.5)] !px-4 !py-3 !text-[14px] !font-medium",
          title: "!text-white !text-[14px] !font-semibold",
          description: "!text-zinc-300 !text-[13px]",
          actionButton:
            "!bg-white !text-zinc-900 !rounded-full !px-3 !py-1 !text-[13px] !font-semibold hover:!bg-zinc-200",
          cancelButton:
            "!bg-white/10 !text-white !rounded-full !px-3 !py-1 !text-[13px]",
          closeButton:
            "!bg-white/10 !text-white !border-white/10 hover:!bg-white/20",
          success: "!bg-zinc-900/92",
          error: "!bg-zinc-900/92 !border-red-500/30",
          loading: "!bg-zinc-900/92",
        },
      }}
    />
  );
}
