import { AccountList } from "@/components/admin/account-list";
import { AppOpens } from "@/components/admin/app-opens";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { AnnouncementModal } from "@/components/admin/announcement-modal";
import { Campaigns } from "@/components/admin/campaigns";
import { GrowthChart } from "@/components/admin/growth-chart";
import { MoreRows } from "@/components/admin/more-rows";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { formatAgo } from "@/lib/admin-time";
import { ThemeSwitch } from "@/components/wallet/theme-switch";
import type { AdminCamera, AdminData, AdminFeedGroup, AdminViewer } from "@/lib/admin.server";
import { OFTEN_OPENS } from "@/lib/analytics";
import { USAGE_KINDS, USAGE_LABEL } from "@/lib/usage";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

function usd(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function percent(share: number): string {
  return `${Math.round(share * 100)}%`;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="min-w-0">
      <h2 className="text-[17px] font-semibold tracking-[-0.02em]">{title}</h2>
      {hint && <p className="mt-1 text-[13px] text-muted">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** The card is the sideways scroller. The list inside is as wide as its widest row, so nothing wraps away. */
function Rows({ as: Tag = "ul", children }: { as?: "ul" | "ol"; children: ReactNode }) {
  return (
    <div className="@container overflow-x-auto overscroll-x-contain rounded-3xl border border-line bg-surface">
      <Tag className="w-max min-w-full divide-y divide-line">{children}</Tag>
    </div>
  );
}

const LINE = "flex w-full items-baseline justify-between gap-4 whitespace-nowrap";

const FEED_KIND = { hls: "Live", image: "Snapshot", embed: "Embed" } as const;

function CameraList({
  name,
  detail,
  cameras,
}: {
  name: string;
  detail: string;
  cameras: { key: string; label: string; kind: string | null; src: string; source: "saved" | "fallback" }[];
}) {
  return (
    <div>
      <div className="mb-2">
        <p className="text-[15px] font-medium">{name}</p>
        <p className="text-[13px] text-muted">{detail}</p>
      </div>
      <Rows>
        {cameras.map((camera) => (
          <li key={camera.key} className="px-4 py-3">
            <div className={LINE}>
              <p className="text-[15px] font-medium">{camera.label}</p>
              <p className="shrink-0 text-[13px] text-muted">
                {camera.kind ? `${camera.kind}, ` : ""}
                {camera.source === "saved" ? "Saved" : "Built in"}
              </p>
            </div>
            <p className="mt-1 font-mono text-[12px] whitespace-nowrap text-muted" title={camera.src}>
              {camera.src}
            </p>
          </li>
        ))}
      </Rows>
    </div>
  );
}

function brownsvilleCameras(cameras: AdminCamera[]) {
  return cameras.map((camera) => ({
    key: camera.alias,
    label: camera.name,
    kind: "Live",
    src: camera.src,
    source: camera.source,
  }));
}

function groupCameras(group: AdminFeedGroup) {
  return group.feeds.map((feed) => ({
    key: feed.id,
    label: feed.label,
    kind: feed.kind ? FEED_KIND[feed.kind] : null,
    src: feed.src,
    source: feed.source,
  }));
}

function Funnel({ steps }: { steps: AdminData["insights"]["funnel"] }) {
  return (
    <Rows as="ol">
      {steps.map((step) => (
        <li key={step.key} className="px-4 py-3">
          <div className={LINE}>
            <p className="text-[15px] font-medium">{step.label}</p>
            <p className="shrink-0 text-[15px] font-semibold tabular-nums">
              {step.count.toLocaleString("en-US")}
              <span className="ml-2 text-[13px] font-normal text-muted">{percent(step.share)}</span>
            </p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-strong">
            <div className="h-full rounded-full bg-foreground" style={{ width: percent(step.share) }} />
          </div>
        </li>
      ))}
    </Rows>
  );
}

export function AdminDashboard({ viewer, data }: { viewer: AdminViewer; data: AdminData }) {
  const { insights } = data;
  const now = Date.parse(insights.generatedAt);

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full min-w-0 max-w-5xl flex-col overflow-x-clip px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(3rem,env(safe-area-inset-bottom))] sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="-ml-2 inline-flex min-h-11 items-center rounded-full px-2 text-[15px] font-medium text-muted transition-colors hover:text-foreground active:text-foreground"
        >
          Back to app
        </Link>
        <div className="flex items-center gap-2">
          <ThemeSwitch />
          <SignOutButton />
        </div>
      </header>

      <div
        className="rise mt-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-5 sm:mt-10"
        style={{ "--i": 0 } as CSSProperties}
      >
        <div className="min-w-0">
          <h1 className="text-[34px] leading-[1.05] font-bold tracking-[-0.04em]">Admin</h1>
          <p className="mt-2 truncate text-[15px] text-muted">{viewer.email}</p>
          <p className={`mt-0.5 text-[13px] ${data.feed ? "text-muted" : "text-danger"}`}>
            {data.feed
              ? `CBP feed updated ${formatAgo(data.feed.fetchedAt, now)}, ${data.feed.ports.toLocaleString("en-US")} crossings`
              : "The CBP feed did not answer."}
          </p>
        </div>
        <AnnouncementModal initial={data.announcements} />
      </div>

      {data.problem && (
        <p className="mt-6 rounded-2xl border border-line bg-surface px-4 py-3 text-[14px] text-danger" role="alert">
          Some of these figures could not be read.
        </p>
      )}

      {/* One surface, hairline cells: four separate cards weighed more than the numbers inside them. */}
      <dl
        className="rise mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-line max-lg:[&>*:last-child:nth-child(odd)]:col-span-2 lg:grid-cols-5"
        style={{ "--i": 1 } as CSSProperties}
      >
        {data.stats.map((stat) => (
          <div key={stat.label} className="bg-surface px-4 py-4">
            <dt className="text-[13px] font-medium text-muted">{stat.label}</dt>
            <dd className="mt-2 text-[32px] leading-none font-bold tracking-[-0.04em] tabular-nums">
              {stat.value.toLocaleString("en-US")}
            </dd>
            <p className="mt-2 text-[13px] text-muted">{stat.detail}</p>
          </div>
        ))}
      </dl>

      <div className="mt-8 min-w-0">
        <AdminTabs
          overview={
            <div className="flex min-w-0 flex-col gap-10">
              <div className="grid min-w-0 gap-10 lg:grid-cols-2 lg:gap-14">
              <div className="flex flex-col gap-10">
                <Section
                  title="Arrivals"
                  hint="Browsers that opened the sign-in screen, and how many went on to sign in. Counted since this was turned on."
                >
                  {data.arrivals === null || data.arrivals.total === 0 ? (
                    <p className="text-[15px] text-muted">No arrivals counted yet.</p>
                  ) : (
                    <Rows>
                      {(
                        [
                          ["All time", data.arrivals.total, data.arrivals.registered],
                          ["Last 7 days", data.arrivals.weekTotal, data.arrivals.weekRegistered],
                        ] as const
                      ).map(([label, total, registered]) => (
                        <li key={label} className="px-4 py-3">
                          <div className={LINE}>
                            <p className="text-[15px] font-medium">{label}</p>
                            <p className="shrink-0 text-[15px] font-semibold tabular-nums">
                              {total.toLocaleString("en-US")}
                            </p>
                          </div>
                          <p className="mt-1 flex gap-x-2 text-[13px] whitespace-nowrap text-muted">
                            <span>{registered.toLocaleString("en-US")} signed in</span>
                            <span>{(total - registered).toLocaleString("en-US")} did not</span>
                            <span>{percent(total === 0 ? 0 : registered / total)} signed in</span>
                          </p>
                        </li>
                      ))}
                    </Rows>
                  )}
                </Section>

                <Section
                  title="Journey"
                  hint={`How far accounts get, from sign-in to asking a question. ${insights.recent.toLocaleString("en-US")} of ${data.accountTotal.toLocaleString("en-US")} were active in the last 7 days, and ${insights.idle.toLocaleString("en-US")} have done nothing beyond signing in.`}
                >
                  <Funnel steps={insights.funnel} />
                </Section>
              </div>

              <div className="flex flex-col gap-10">
                <Section title="Growth">
                  <GrowthChart
                    days={insights.growth}
                    before={Math.max(0, insights.accounts.length - insights.growth.reduce((sum, entry) => sum + entry.count, 0))}
                    now={now}
                  />
                </Section>
              </div>
              </div>
              <Section
                title="Uses"
                hint="Every time a signed-in account opens the app, including coming back to it. Unique is how many different accounts did that in the dates you pick."
              >
                <AppOpens initial={data.opens} now={now} />
              </Section>
            </div>
          }
          acquisition={
            <div className="grid min-w-0 gap-10 lg:grid-cols-2 lg:gap-14">
              <div className="flex flex-col gap-10">
                <Section title="Where they came from" hint="Each source with how many came back and set something up.">
                  {insights.sources.length === 0 ? (
                    <p className="text-[15px] text-muted">No accounts yet.</p>
                  ) : (
                    <Rows>
                      {insights.sources.map((source) => (
                        <li key={source.key} className="px-4 py-3">
                          <div className={LINE}>
                            <p className="text-[15px] font-medium">{source.label}</p>
                            <p className="shrink-0 text-[15px] font-semibold tabular-nums">
                              {source.accounts.toLocaleString("en-US")}
                            </p>
                          </div>
                          <p className="mt-1 flex gap-x-2 text-[13px] whitespace-nowrap text-muted">
                            <span>{source.returned} came back</span>
                            <span>{source.activated} set up crossings</span>
                            <span>{source.avgDays} days on average</span>
                          </p>
                        </li>
                      ))}
                    </Rows>
                  )}
                </Section>

                <Section title="Invites" hint="Who brought people in, and how many of them did something.">
                  {insights.inviters.length === 0 ? (
                    <p className="text-[15px] text-muted">No one has brought someone in yet.</p>
                  ) : (
                    <MoreRows noun="people">
                      {insights.inviters.map((inviter) => (
                        <li key={inviter.id} className="px-4 py-3">
                          <div className={LINE}>
                            <p className="text-[15px] font-medium">{inviter.name}</p>
                            <p className="shrink-0 text-[15px] font-semibold tabular-nums">
                              {inviter.invited.length.toLocaleString("en-US")}
                            </p>
                          </div>
                          <p className="mt-1 text-[13px] whitespace-nowrap text-muted">
                            {inviter.activated} of {inviter.invited.length} set up crossings:{" "}
                            {inviter.invited.slice(0, 3).map((child) => child.name).join(", ")}
                            {inviter.invited.length > 3 ? ` and ${inviter.invited.length - 3} more` : ""}
                          </p>
                        </li>
                      ))}
                    </MoreRows>
                  )}
                </Section>
              </div>

              <Campaigns initial={data.campaigns} />
            </div>
          }
          accounts={
            <Section
              title="Accounts"
              hint="Open one to see everything it has done, and follow invites between people."
            >
              {insights.accounts.length === 0 ? (
                <p className="text-[15px] text-muted">No accounts yet.</p>
              ) : (
                <AccountList
                  accounts={insights.accounts}
                  now={now}
                  portLabels={data.portLabels}
                  campaignNames={Object.fromEntries(data.campaigns.map((campaign) => [campaign.slug, campaign.name]))}
                />
              )}
              {data.accountTotal > insights.accounts.length && (
                <p className="mt-3 text-[13px] text-muted">
                  Showing the latest {insights.accounts.length.toLocaleString("en-US")} of{" "}
                  {data.accountTotal.toLocaleString("en-US")}.
                </p>
              )}
            </Section>
          }
          usage={
            <div className="grid min-w-0 gap-10 lg:grid-cols-2 lg:gap-14">
              <div className="flex min-w-0 flex-col gap-10">
              <Section
                title="Saved by city"
                hint={`Where riders keep their bridges. ${data.cities.accounts.toLocaleString("en-US")} accounts have saved ${data.cities.saved.toLocaleString("en-US")} bridges. A person with bridges in two cities counts in both, so the rows add up to more than the accounts.`}
              >
                {data.cities.cities.length === 0 ? (
                  <p className="text-[15px] text-muted">No one has saved a bridge yet.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Rows>
                      {data.cities.regions.map((side) => (
                        <li key={side.region} className={`${LINE} px-4 py-3`}>
                          <div>
                            <p className="text-[15px] font-medium">{side.region}</p>
                            <p className="text-[13px] text-muted">
                              {percent(data.cities.accounts === 0 ? 0 : side.accounts / data.cities.accounts)} of accounts
                              with a saved bridge, {side.saved.toLocaleString("en-US")} bridges
                            </p>
                          </div>
                          <p className="shrink-0 text-[15px] font-semibold tabular-nums">
                            {side.accounts.toLocaleString("en-US")}
                          </p>
                        </li>
                      ))}
                    </Rows>
                    <MoreRows noun="cities">
                      {data.cities.cities.map((row) => (
                        <li key={`${row.region}:${row.city}`} className={`${LINE} px-4 py-3`}>
                          <div>
                            <p className="text-[15px] font-medium">{row.city}</p>
                            <p className="text-[13px] text-muted">
                              {row.region}, {percent(data.cities.accounts === 0 ? 0 : row.accounts / data.cities.accounts)}{" "}
                              of accounts, {row.saved.toLocaleString("en-US")} bridges
                            </p>
                          </div>
                          <p className="shrink-0 text-[15px] font-semibold tabular-nums">
                            {row.accounts.toLocaleString("en-US")}
                          </p>
                        </li>
                      ))}
                    </MoreRows>
                    {data.cities.unplaced > 0 && (
                      <p className="text-[13px] text-muted">
                        {data.cities.unplaced.toLocaleString("en-US")} saved bridges are at a crossing that is not in the
                        CBP feed right now, so they have no city.
                      </p>
                    )}
                  </div>
                )}
              </Section>

              <Section title="Crossings" hint="Who saved, watches, or schedules each crossing, next to its wait right now.">
                {data.crossings.length === 0 ? (
                  <p className="text-[15px] text-muted">No one has saved or watched a crossing.</p>
                ) : (
                  <MoreRows noun="crossings">
                    {data.crossings.map((crossing) => (
                      <li key={crossing.portNumber} className={`${LINE} px-4 py-3`}>
                        <div>
                          <p className="text-[15px] font-medium">{crossing.label}</p>
                          <p className="text-[13px] text-muted">
                            {crossing.saved} saved, {crossing.alerts} alerts, {crossing.alarms} alarms,{" "}
                            {crossing.opens} {crossing.opens === 1 ? "open" : "opens"} by {crossing.viewers}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[15px] font-semibold tabular-nums">
                            {crossing.people.toLocaleString("en-US")} {crossing.people === 1 ? "person" : "people"}
                          </p>
                          <p className="text-[13px] text-muted tabular-nums">
                            {crossing.waitMinutes === null ? "No wait data" : `${crossing.waitMinutes} min now`}
                          </p>
                        </div>
                      </li>
                    ))}
                  </MoreRows>
                )}
              </Section>
              </div>

              <div className="flex flex-col gap-10">
                <Section title="Feature use" hint="Everything riders have done, counted per action.">
                  {data.usage.active === 0 ? (
                    <p className="text-[15px] text-muted">No activity yet.</p>
                  ) : (
                    <Rows>
                      <li className={`${LINE} px-4 py-3`}>
                        <p className="text-[15px] font-medium">Active accounts</p>
                        <p className="shrink-0 text-[15px] font-semibold tabular-nums">
                          {data.usage.active.toLocaleString("en-US")}
                        </p>
                      </li>
                      {USAGE_KINDS.map((kind) => (
                        <li key={kind} className={`${LINE} px-4 py-3`}>
                          <p className="text-[15px] font-medium">{USAGE_LABEL[kind]}</p>
                          <p className="shrink-0 text-[15px] font-semibold tabular-nums">
                            {data.usage.byKind[kind].toLocaleString("en-US")}
                          </p>
                        </li>
                      ))}
                    </Rows>
                  )}
                </Section>
  
                {data.exchange && data.exchange.conversions > 0 && (
                  <Section title="Exchange" hint="Amounts riders settled on in the converter, in dollars.">
                    <Rows>
                      {(
                        [
                          ["People", data.exchange.people.toLocaleString("en-US")],
                          ["Conversions", data.exchange.conversions.toLocaleString("en-US")],
                          ["Last 7 days", data.exchange.last7.toLocaleString("en-US")],
                          ["Typical amount", usd(data.exchange.medianUsd)],
                          ["Largest amount", usd(data.exchange.maxUsd)],
                          [
                            "Started from",
                            `${data.exchange.fromUsd.toLocaleString("en-US")} USD, ${data.exchange.fromMxn.toLocaleString("en-US")} MXN`,
                          ],
                        ] as const
                      ).map(([label, value]) => (
                        <li key={label} className={`${LINE} px-4 py-3`}>
                          <p className="text-[15px] font-medium">{label}</p>
                          <p className="shrink-0 text-[15px] font-semibold tabular-nums">{value}</p>
                        </li>
                      ))}
                    </Rows>
                  </Section>
                )}
  
                <Section
                  title="Opened often, no alert"
                  hint={`Accounts that opened a crossing ${OFTEN_OPENS} or more times with no alert or alarm on it.`}
                >
                  {insights.often.length === 0 ? (
                    <p className="text-[15px] text-muted">No one yet.</p>
                  ) : (
                    <MoreRows noun="people">
                      {insights.often.map((row) => (
                        <li key={`${row.userId}:${row.portNumber}`} className="px-4 py-3">
                          <div className={LINE}>
                            <p className="text-[15px] font-medium">{row.name}</p>
                            <p className="shrink-0 text-[15px] font-semibold tabular-nums">
                              {row.opens.toLocaleString("en-US")} {row.opens === 1 ? "open" : "opens"}
                            </p>
                          </div>
                          <p className="mt-1 text-[13px] whitespace-nowrap text-muted">
                            {data.portLabels[row.portNumber] ?? row.portNumber}
                            {row.lastOpenedAt ? `, last ${formatAgo(row.lastOpenedAt, now)}` : ""}
                          </p>
                        </li>
                      ))}
                    </MoreRows>
                  )}
                </Section>
              </div>
            </div>
          }
          cameras={
            <Section
              title="Cameras"
              hint="Nuevo and Viejo, then every other crossing. Saved means that address is in the database."
            >
              <div className="flex flex-col gap-6">
                <CameraList name="Brownsville" detail="Comtodo" cameras={brownsvilleCameras(data.cameras)} />
                {data.feedGroups.map((group) => (
                  <CameraList key={group.id} name={group.name} detail={group.detail} cameras={groupCameras(group)} />
                ))}
              </div>
            </Section>
          }
        />
      </div>
    </div>
  );
}
