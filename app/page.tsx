import { ShellSkeleton } from "@/components/wallet/shell-skeleton";
import { WalletApp } from "@/components/wallet/wallet-app";
import { getBorderWaitTimes, type BorderWaitTimes } from "@/lib/border-wait-times";
import { Suspense } from "react";

export default function Home() {
  return (
    <main>
      <Suspense fallback={<ShellSkeleton />}>
        <LiveWallet />
      </Suspense>
    </main>
  );
}

/** Fetches the cached CBP snapshot on the server. If CBP is down, the client retries on its own. */
async function LiveWallet() {
  let initial: BorderWaitTimes | null = null;
  try {
    initial = await getBorderWaitTimes();
  } catch {
    initial = null;
  }
  return <WalletApp initial={initial} />;
}
