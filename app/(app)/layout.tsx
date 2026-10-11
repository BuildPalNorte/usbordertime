import { SessionGate } from "@/components/wallet/session-gate";
import { ShellSkeleton } from "@/components/wallet/shell-skeleton";
import { SignInScreen } from "@/components/wallet/sign-in-screen";
import { WalletApp } from "@/components/wallet/wallet-app";
import { getAuth } from "@/lib/auth/server";
import { getBorderWaitTimes, type BorderWaitTimes } from "@/lib/border-wait-times";
import { getCameraStreams } from "@/lib/camera-streams";
import { fallbackCameraStreams } from "@/lib/ports";
import { ensureProfile } from "@/lib/profile";
import { headers } from "next/headers";
import { Suspense, type ReactNode } from "react";

export const instant = false;

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <main>
      <Suspense fallback={<ShellSkeleton wordless />}>
        <GatedHome>{children}</GatedHome>
      </Suspense>
    </main>
  );
}

/** The bridges render only after Google sign-in, and that visit writes the profile. */
async function GatedHome({ children }: { children: ReactNode }) {
  const session = await getAuth().api.getSession({ headers: await headers() });
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
      <LiveWallet>{children}</LiveWallet>
    </SessionGate>
  );
}

/** Fetches the cached CBP snapshot on the server. If CBP is down, the client retries on its own. */
async function LiveWallet({ children }: { children: ReactNode }) {
  let initial: BorderWaitTimes | null = null;
  try {
    initial = await getBorderWaitTimes();
  } catch {
    initial = null;
  }
  let streams = fallbackCameraStreams();
  try {
    streams = await getCameraStreams();
  } catch {
    streams = fallbackCameraStreams();
  }
  return (
    <>
      <Suspense fallback={<ShellSkeleton wordless />}>
        <WalletApp initial={initial} streams={streams} />
      </Suspense>
      {children}
    </>
  );
}
