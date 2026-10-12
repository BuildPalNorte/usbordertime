import { AdminAccess } from "@/components/wallet/admin-access";
import { AlertSync } from "@/components/wallet/alert-sync";
import { PreferenceSync } from "@/components/wallet/preference-sync";
import { SessionGate } from "@/components/wallet/session-gate";
import { StreakSync } from "@/components/wallet/streak-sync";
import { ShellSkeleton } from "@/components/wallet/shell-skeleton";
import { ReferralPrompt } from "@/components/wallet/referral-prompt";
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
import { connection } from "next/server";
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

/** The bridges render only after Google sign-in. A new profile answers how they found the app first. */
async function GatedHome({ children }: { children: ReactNode }) {
  // The session depends on the request and the clock. Defer to request time so it is not prerendered.
  await connection();
  const headerList = await headers();
  const session = await getAuth().api.getSession({ headers: headerList });
  const user = session?.user;
  if (!user?.id || !user.email) return <SignInScreen />;

  // The profile and the preference do not depend on each other, so read them together.
  const [profileResult, preferenceResult] = await Promise.allSettled([
    ensureProfile({
      id: user.id,
      email: user.email,
      name: user.name || user.email,
      image: user.image ?? null,
    }),
    getPreference(user.id),
  ]);
  if (profileResult.status === "rejected") {
    console.error("profile", profileResult.reason);
    return <SignInScreen problem="profile" />;
  }

  if (profileResult.value.referralPending) {
    return (
      <SessionGate>
        <ReferralPrompt />
      </SessionGate>
    );
  }

  const preferenceReady = preferenceResult.status === "fulfilled";
  const preference: PreferenceRecord | null = preferenceReady ? preferenceResult.value : null;
  if (!preferenceReady) console.error("preference", preferenceResult.reason);

  return (
    <AdminAccess allowed={isAdminEmail(user.email)}>
      <SessionGate>
        <PreferenceSync userId={user.id} initial={preference} ready={preferenceReady} />
        <AlertSync />
        <StreakSync />
        <LiveWallet userId={user.id}>{children}</LiveWallet>
      </SessionGate>
    </AdminAccess>
  );
}

/** Fetches the cached CBP snapshot on the server. If CBP is down, the client retries on its own. */
async function LiveWallet({ userId, children }: { userId: string; children: ReactNode }) {
  const [snapshot, cameras] = await Promise.allSettled([getBorderWaitTimes(), getCameraStreams()]);
  const initial: BorderWaitTimes | null = snapshot.status === "fulfilled" ? snapshot.value : null;
  const streams = cameras.status === "fulfilled" ? cameras.value : fallbackCameraStreams();
  return (
    <>
      <Suspense fallback={<ShellSkeleton wordless />}>
        <WalletApp initial={initial} streams={streams} userId={userId} />
      </Suspense>
      {children}
    </>
  );
}
