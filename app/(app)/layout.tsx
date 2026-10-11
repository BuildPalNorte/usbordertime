import { AdminAccess } from "@/components/wallet/admin-access";
import { AlertSync } from "@/components/wallet/alert-sync";
import { PreferenceSync } from "@/components/wallet/preference-sync";
import { SessionGate } from "@/components/wallet/session-gate";
import { StreakSync } from "@/components/wallet/streak-sync";
import { ShellSkeleton } from "@/components/wallet/shell-skeleton";
import { SignInScreen } from "@/components/wallet/sign-in-screen";
import { WalletApp } from "@/components/wallet/wallet-app";
import { isAdminEmail } from "@/lib/admin.server";
import { getAuth } from "@/lib/auth/server";
import { getBorderWaitTimes, type BorderWaitTimes } from "@/lib/border-wait-times";
import { getCameraStreams } from "@/lib/camera-streams";
import { fallbackCameraStreams } from "@/lib/ports";
import type { PreferenceRecord } from "@/lib/preference";
import { getPreference } from "@/lib/preference.server";
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
  const headerList = await headers();
  const session = await getAuth().api.getSession({ headers: headerList });
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

  let preference: PreferenceRecord | null = null;
  let preferenceReady = false;
  try {
    preference = await getPreference(user.id);
    preferenceReady = true;
  } catch {
    preferenceReady = false;
  }

  return (
    <AdminAccess allowed={isAdminEmail(user.email)}>
      <SessionGate>
        <PreferenceSync userId={user.id} initial={preference} ready={preferenceReady} />
        <AlertSync />
        <StreakSync />
        <LiveWallet>{children}</LiveWallet>
      </SessionGate>
    </AdminAccess>
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
