"use client";

import { AskPane } from "@/components/wallet/ask-pane";
import { TabBar } from "@/components/wallet/tab-bar";

/** Temporary layout check for the Ask composer. Not a real route. */
export default function PreviewAsk() {
  return (
    <div className="relative max-lg:fixed max-lg:inset-0 max-lg:overflow-hidden">
      <div className="relative mx-auto flex h-full w-full max-w-md flex-col overflow-x-clip overflow-y-auto overscroll-y-contain px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[var(--tab-clearance)]">
        <header className="flex min-h-[4.5rem] shrink-0 items-end pb-5">
          <h1 className="text-[34px] leading-none font-bold tracking-[-0.035em]">Preguntar</h1>
        </header>
        <div className="flex min-h-0 flex-1 flex-col">
          <section className="pane flex min-h-0 flex-1 flex-col" data-active="true">
            <AskPane ownsHeader />
          </section>
        </div>
      </div>
      <TabBar tab="ask" onChange={() => {}} />
    </div>
  );
}
