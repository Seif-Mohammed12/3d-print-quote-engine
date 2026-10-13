// Shown while a lazily loaded page chunk downloads. Mirrors the Layout shell
// (56px ruled bar, graphite board) so the swap to the real page doesn't jump.
const block = "motion-safe:animate-pulse bg-card";

const RouteFallback = () => (
  <div className="flex min-h-screen flex-col" role="status" aria-live="polite">
    <span className="sr-only">Loading page</span>
    <div className="fixed inset-x-0 top-0 z-40 border-b border-border bg-background" aria-hidden="true">
      <div className="frame flex h-14 items-center justify-between gap-6">
        <div className={`h-5 w-32 ${block}`} />
        <div className={`h-5 w-20 ${block}`} />
      </div>
    </div>
    <div className="frame flex-1 pt-14" aria-hidden="true">
      <div className="grid gap-8 py-10 md:grid-cols-2 md:py-16">
        <div className={`aspect-square ${block}`} />
        <div className="space-y-4">
          <div className={`h-4 w-24 ${block}`} />
          <div className={`h-10 w-3/4 ${block}`} />
          <div className={`h-4 w-full ${block}`} />
          <div className={`h-4 w-5/6 ${block}`} />
          <div className={`mt-8 h-12 w-48 ${block}`} />
        </div>
      </div>
    </div>
  </div>
);

export default RouteFallback;
