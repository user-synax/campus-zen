/**
 * Instant navigation fallback for /c/* — mirrors the Colleges tab (title,
 * search bar, single-column college rows) so the swap into the real page
 * barely moves anything. Seeded rows stagger via --skel-idx like the card
 * skeletons elsewhere in the app.
 */
export default function Loading() {
  return (
    <div>
      <div className="px-4 pt-4 pb-3">
        <div className="t-shimmer h-5 w-24 rounded" />
        <div className="mt-2 t-shimmer h-3 w-20 rounded" />
      </div>
      <div className="border-b border-[var(--cz-border)] px-4 pb-3">
        <div className="t-shimmer h-[44px] w-full rounded-full" />
      </div>
      <div>
        {["c0", "c1", "c2", "c3", "c4", "c5"].map((k, i) => (
          <div
            key={k}
            style={{ "--skel-idx": i % 3 }}
            className="t-skel-item cz-row flex items-center gap-3 px-4 py-3"
          >
            <div className="t-shimmer h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="t-shimmer h-3 w-40 rounded" />
              <div className="t-shimmer h-3 w-24 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
