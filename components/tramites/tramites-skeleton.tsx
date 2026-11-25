/** Loading shell for /tramites. Matches the dark page, not the wallet stack. */
export function TramitesSkeleton() {
  return (
    <div
      aria-busy
      aria-label="Loading"
      className="min-h-[100dvh] bg-[#050608] text-white"
    >
      <header className="sticky top-[-0.5rem] z-30 -mb-16 pt-2 sm:top-[-1rem] sm:-mb-20 sm:pt-4">
        <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between gap-3 px-7 sm:h-16 sm:px-12">
          <div className="flex flex-col items-start gap-1.5">
            <span className="tramites-pulse h-4 w-12 rounded-full" />
            <span className="tramites-pulse h-2.5 w-24 rounded-full" style={{ animationDelay: "120ms" }} />
          </div>
          <div className="flex items-center gap-2">
            <span className="tramites-pulse hidden h-8 w-36 rounded-full sm:block" style={{ animationDelay: "80ms" }} />
            <span className="tramites-pulse size-9 rounded-full" style={{ animationDelay: "160ms" }} />
            <span className="tramites-pulse size-9 rounded-full" style={{ animationDelay: "220ms" }} />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1200px] px-2 pt-2 sm:px-4 sm:pt-4">
        <section
          className="relative isolate overflow-hidden rounded-[20px]"
          style={{
            background:
              "radial-gradient(60% 55% at 62% 0%, rgba(43,100,240,0.55), transparent 70%), radial-gradient(45% 45% at 20% 10%, rgba(26,73,199,0.35), transparent 70%), linear-gradient(180deg, #07122c 0%, #050608 100%)",
          }}
        >
          <div
            aria-hidden
            className="tramites-glow pointer-events-none absolute inset-x-[15%] top-[-20%] h-[55%] rounded-full bg-[color:#2b64f0]/35 blur-[80px]"
          />
          <div className="mx-auto flex max-w-3xl flex-col items-center px-5 pt-20 pb-24 sm:pt-28 sm:pb-32">
            <span className="tramites-pulse h-10 w-[min(100%,22rem)] rounded-full sm:h-14 sm:w-[28rem]" />
            <span
              className="tramites-pulse mt-3 h-10 w-[min(90%,18rem)] rounded-full sm:h-14 sm:w-[22rem]"
              style={{ animationDelay: "100ms" }}
            />
            <span
              className="tramites-pulse mt-8 h-3.5 w-[min(100%,26rem)] rounded-full"
              style={{ animationDelay: "180ms" }}
            />
            <span
              className="tramites-pulse mt-2 h-3.5 w-[min(85%,20rem)] rounded-full"
              style={{ animationDelay: "240ms" }}
            />
            <span
              className="tramites-pulse mt-10 h-14 w-full max-w-xl rounded-full"
              style={{ animationDelay: "320ms" }}
            />
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="tramites-pulse h-8 rounded-full"
                  style={{ width: `${7 + i * 2}rem`, animationDelay: `${400 + i * 70}ms` }}
                />
              ))}
            </div>
            <div className="mt-8 flex items-center gap-3">
              <span className="tramites-pulse h-10 w-40 rounded-full" style={{ animationDelay: "560ms" }} />
              <span className="tramites-pulse h-10 w-28 rounded-full" style={{ animationDelay: "620ms" }} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
