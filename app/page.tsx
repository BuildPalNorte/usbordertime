import { SessionGate } from "@/components/wallet/session-gate";
import { ShellSkeleton } from "@/components/wallet/shell-skeleton";
import { SignInScreen } from "@/components/wallet/sign-in-screen";
import { WalletApp } from "@/components/wallet/wallet-app";
import { auth } from "@/lib/auth/server";
import { getBorderWaitTimes, type BorderWaitTimes } from "@/lib/border-wait-times";
import { ensureProfile } from "@/lib/profile";
import { headers } from "next/headers";
import { Suspense } from "react";

export default function Home() {
  return (
    <main>
      <Suspense fallback={<ShellSkeleton wordless />}>
        <GatedHome />
      </Suspense>
    </main>
  );
}

/** The bridges render only after Google sign-in, and that visit writes the profile. */
async function GatedHome() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user?.id || !user.email) return <SignInScreen />;

  try {
    await ensureProfile({
      id: user.id,
      email: user.email,
      name: user.name || user.email,
      image: user.image ?? null,
    });
  } catch {
    return <SignInScreen problem="profile" />;
  }

  return (
    <SessionGate>
      <LiveWallet />
    </SessionGate>
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
