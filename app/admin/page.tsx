import { AdminDashboard } from "@/components/admin/dashboard";
import { SignInScreen } from "@/components/wallet/sign-in-screen";
import { openAdmin } from "@/lib/admin.server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export const instant = false;

export const metadata: Metadata = {
  title: "Border Time",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <main>
      <Suspense fallback={<AdminFallback />}>
        <AdminGate />
      </Suspense>
    </main>
  );
}

async function AdminGate() {
  const opened = await openAdmin();
  if (opened.kind === "anonymous") return <SignInScreen />;
  if (opened.kind === "denied") notFound();
  return <AdminDashboard viewer={opened.viewer} data={opened.data} />;
}

function AdminFallback() {
  return (
    <div
      aria-busy="true"
      className="mx-auto w-full max-w-5xl px-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6"
    >
      <div className="h-4 w-16 rounded-full bg-surface-strong" />
      <div className="mt-10 h-10 w-40 rounded-2xl bg-surface-strong" />
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-28 rounded-3xl bg-surface" />
        ))}
      </div>
    </div>
  );
}
