import { SignOutButton } from "@/components/admin/sign-out-button";
import { ThemeSwitch } from "@/components/wallet/theme-switch";
import type { AdminData, AdminUsage, AdminViewer } from "@/lib/admin.server";
import { USAGE_KINDS, USAGE_LABEL, type UsageKind } from "@/lib/usage";
import Link from "next/link";
import type { CSSProperties } from "react";

const WHEN = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Chicago",
  timeZoneName: "short",
});

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return WHEN.format(date);
}

/** The kinds an account actually used, in the order the dashboard lists them. */
function usedKinds(usage: AdminUsage): UsageKind[] {
  return USAGE_KINDS.filter((kind) => usage.byKind[kind] > 0);
}

function UsageSummary({ usage }: { usage: AdminUsage }) {
  if (usage.total === 0) return <p className="text-[13px] text-muted">No activity yet.</p>;
  return (
    <p className="text-[13px] text-muted">
      {usedKinds(usage)
        .map((kind) => `${usage.byKind[kind].toLocaleString("en-US")} ${USAGE_LABEL[kind].toLowerCase()}`)
        .join(" · ")}
    </p>
  );
}

export function AdminDashboard({ viewer, data }: { viewer: AdminViewer; data: AdminData }) {
  const showing = data.people.length;
  const rest = data.accountTotal - showing;

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(3rem,env(safe-area-inset-bottom))] sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <Link href="/" className="text-[15px] font-medium text-muted">
          Back
        </Link>
        <div className="flex items-center gap-4">
          <ThemeSwitch />
          <SignOutButton />
        </div>
      </header>

      <div className="rise mt-10" style={{ "--i": 0 } as CSSProperties}>
        <h1 className="text-[34px] leading-[1.05] font-bold tracking-[-0.04em]">Admin</h1>
        <p className="mt-2 truncate text-[15px] text-muted">{viewer.email}</p>
      </div>

      {data.problem && (
        <p className="mt-6 rounded-2xl border border-line bg-surface px-4 py-3 text-[14px] text-danger" role="alert">
          Some of these figures could not be read.
        </p>
      )}

      <dl className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {data.stats.map((stat, index) => (
          <div
            key={stat.label}
            className="rise rounded-3xl border border-line bg-surface px-4 py-4"
            style={{ "--i": index + 1 } as CSSProperties}
          >
            <dt className="text-[13px] font-medium text-muted">{stat.label}</dt>
            <dd className="mt-2 text-[32px] leading-none font-bold tracking-[-0.04em] tabular-nums">
              {stat.value.toLocaleString("en-US")}
            </dd>
            <p className="mt-2 text-[13px] text-muted">{stat.detail}</p>
          </div>
        ))}
      </dl>

      <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="flex flex-col gap-10">
          <section>
            <h2 className="text-[17px] font-semibold tracking-[-0.02em]">Accounts</h2>
            {data.people.length === 0 ? (
              <p className="mt-3 text-[15px] text-muted">No accounts yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
                {data.people.map((person) => (
                  <li key={person.email} className="flex items-baseline justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-medium">{person.name}</p>
                      <p className="truncate text-[13px] text-muted">{person.email}</p>
                      {person.referral && <p className="truncate text-[13px] text-muted">{person.referral}</p>}
                      {person.invitedBy && (
                        <p className="truncate text-[13px] text-muted">Invited by {person.invitedBy}</p>
                      )}
                      <UsageSummary usage={person.usage} />
                    </div>
                    <div className="shrink-0 text-right">
                      <time className="text-[13px] text-muted" dateTime={person.updatedAt}>
                        {formatWhen(person.updatedAt)}
                      </time>
                      {person.usage.lastActive && (
                        <p className="mt-1 text-[13px] text-muted">
                          Active{" "}
                          <time dateTime={person.usage.lastActive}>{formatWhen(person.usage.lastActive)}</time>
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {rest > 0 && (
              <p className="mt-3 text-[13px] text-muted">
                Showing the latest {showing.toLocaleString("en-US")}.
              </p>
            )}
          </section>

          <section>
            <h2 className="text-[17px] font-semibold tracking-[-0.02em]">Usage</h2>
            {data.usage.active === 0 ? (
              <p className="mt-3 text-[15px] text-muted">No activity yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
                <li className="flex items-baseline justify-between gap-4 px-4 py-3">
                  <p className="truncate text-[15px] font-medium">Active accounts</p>
                  <p className="shrink-0 text-[15px] font-semibold tabular-nums">
                    {data.usage.active.toLocaleString("en-US")}
                  </p>
                </li>
                {USAGE_KINDS.map((kind) => (
                  <li key={kind} className="flex items-baseline justify-between gap-4 px-4 py-3">
                    <p className="truncate text-[15px] font-medium">{USAGE_LABEL[kind]}</p>
                    <p className="shrink-0 text-[15px] font-semibold tabular-nums">
                      {data.usage.byKind[kind].toLocaleString("en-US")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-[17px] font-semibold tracking-[-0.02em]">Wait alerts</h2>
            {data.alerts.length === 0 ? (
              <p className="mt-3 text-[15px] text-muted">No wait alerts.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
                {data.alerts.map((group) => (
                  <li
                    key={`${group.portNumber}:${group.lane}`}
                    className="flex items-baseline justify-between gap-4 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-medium">{group.label}</p>
                      <p className="text-[13px] text-muted">{group.lane}</p>
                    </div>
                    <p className="shrink-0 text-[15px] font-semibold tabular-nums">
                      {group.count.toLocaleString("en-US")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-10">
          <section>
            <h2 className="text-[17px] font-semibold tracking-[-0.02em]">How they found us</h2>
            {data.referrals.length === 0 ? (
              <p className="mt-3 text-[15px] text-muted">No answers yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
                {data.referrals.map((source) => (
                  <li key={source.source} className="flex items-baseline justify-between gap-4 px-4 py-3">
                    <p className="truncate text-[15px] font-medium">{source.label}</p>
                    <p className="shrink-0 text-[15px] font-semibold tabular-nums">
                      {source.count.toLocaleString("en-US")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {data.referralPending > 0 && (
              <p className="mt-3 text-[13px] text-muted">
                {data.referralPending === 1
                  ? "1 still choosing."
                  : `${data.referralPending.toLocaleString("en-US")} still choosing.`}
              </p>
            )}
          </section>

          <section>
            <h2 className="text-[17px] font-semibold tracking-[-0.02em]">Invites</h2>
            {data.invites.length === 0 ? (
              <p className="mt-3 text-[15px] text-muted">No one has brought someone in yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
                {data.invites.map((invite) => (
                  <li key={invite.email} className="flex items-baseline justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-medium">{invite.name}</p>
                      {invite.name !== invite.email && (
                        <p className="truncate text-[13px] text-muted">{invite.email}</p>
                      )}
                    </div>
                    <p className="shrink-0 text-[15px] font-semibold tabular-nums">
                      {invite.count.toLocaleString("en-US")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-[17px] font-semibold tracking-[-0.02em]">Cameras</h2>
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
              {data.cameras.map((camera) => (
                <li key={camera.alias} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="truncate text-[15px] font-medium">{camera.name}</p>
                    <p className="shrink-0 text-[13px] text-muted">
                      {camera.source === "saved" ? "Saved" : "Built in"}
                    </p>
                  </div>
                  <p className="mt-1 truncate font-mono text-[12px] text-muted" title={camera.src}>
                    {camera.src}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-[17px] font-semibold tracking-[-0.02em]">Wait times</h2>
            <div className="mt-3 rounded-3xl border border-line bg-surface px-4 py-4">
              {data.feed ? (
                <>
                  <p className="text-[15px] font-medium">{formatWhen(data.feed.fetchedAt)}</p>
                  <p className="mt-1 text-[13px] text-muted">
                    {data.feed.ports.toLocaleString("en-US")} crossings in the latest snapshot
                  </p>
                </>
              ) : (
                <p className="text-[15px] text-muted">The CBP feed did not answer.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
