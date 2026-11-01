/**
 * Instant navigation fallback for /u/* — mirrors the Students tab's own
 * layout (title, search bar, two-column user cards) so the swap into the
 * real page barely moves anything. Seeded rows stagger via --skel-idx like
 * the in-page skeleton on /u/page.jsx.
 */
export default function Loading() {
  return (
    <div>
      <div className="px-4 pt-4 pb-3">
        <div className="t-shimmer h-5 w-28 rounded" />
        <div className="mt-2 t-shimmer h-3 w-20 rounded" />
      </div>
      <div className="border-b border-[var(--cz-border)] px-4 pb-3">
        <div className="t-shimmer h-[44px] w-full rounded-full" />
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        {["s0", "s1", "s2", "s3"].map((k, i) => (
          <div
            key={k}
            style={{ "--skel-idx": i % 3 }}
            className="t-skel-item rounded-[16px] border border-[var(--cz-border)] p-4"
          >
            <div className="flex items-center gap-3">
              <div className="t-shimmer h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="t-shimmer h-3 w-24 rounded" />
                <div className="t-shimmer h-3 w-16 rounded" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="t-shimmer h-3 w-full rounded" />
              <div className="t-shimmer h-3 w-3/4 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
