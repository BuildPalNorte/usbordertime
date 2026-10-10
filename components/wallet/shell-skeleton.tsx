import { CARD_H, PEEK } from "./motion";

/** Server-rendered placeholder shown while CBP data streams in. Matches the final stack's footprint. */
export function ShellSkeleton() {
  return (
    <div
      aria-busy
      className="mx-auto w-full max-w-md px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-32 sm:px-6 lg:max-w-6xl lg:pb-16"
    >
      <div className="lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-14">
        <div>
          <div className="flex min-h-[4.5rem] items-end pb-5">
            <h1 className="text-[34px] leading-none font-bold tracking-[-0.035em]">Wallet</h1>
          </div>
          <div className="relative" style={{ height: CARD_H + PEEK * 2 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="shimmer absolute inset-x-0 top-0 rounded-3xl"
                style={{ height: CARD_H, transform: `translateY(${i * PEEK}px)`, zIndex: i }}
              />
            ))}
          </div>
        </div>
        <div className="mt-10 hidden space-y-2 lg:mt-0 lg:block">
          <div className="flex min-h-[4.5rem] items-end pb-5">
            <h2 className="text-[34px] leading-none font-bold tracking-[-0.035em]">Crossings</h2>
          </div>
          <div className="shimmer h-12 rounded-2xl" />
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="shimmer h-[4.5rem] rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
