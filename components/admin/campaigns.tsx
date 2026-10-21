"use client";

import { campaignPath, type Campaign } from "@/lib/campaign";
import { haptic } from "@/lib/haptics";
import { useRef, useState } from "react";

function usersLabel(count: number): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? "user" : "users"}`;
}

/**
 * Name a campaign, copy `/?c=<slug>`, and read how many new accounts signed in from it.
 * Opens are browsers that landed on the link, counted once, including those who never signed in.
 */
export function Campaigns({ initial }: { initial: Campaign[] }) {
  const [campaigns, setCampaigns] = useState(initial);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef(0);

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed || busy) {
      if (!trimmed) {
        haptic("error");
        setMessage("Give the campaign a name.");
      }
      return;
    }
    haptic("selection");
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = (await response.json().catch(() => null)) as { campaign?: Campaign; error?: string } | null;
      if (!response.ok || !data?.campaign) {
        haptic("error");
        setMessage(data?.error ?? "Could not create that campaign.");
        return;
      }
      haptic("success");
      setCampaigns((current) => [data.campaign!, ...current.filter((row) => row.slug !== data.campaign!.slug)]);
      setName("");
    } catch {
      haptic("error");
      setMessage("Could not create that campaign.");
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async (slug: string) => {
    haptic("selection");
    const link = `${window.location.origin}${campaignPath(slug)}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      haptic("error");
      setMessage("Could not copy that link.");
      return;
    }
    setCopied(slug);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(null), 2000);
  };

  return (
    <section className="min-w-0">
      <h2 className="text-[17px] font-semibold tracking-[-0.02em]">Campaigns</h2>
      <p className="mt-1 text-[13px] text-muted">
        Create the link before you share it. Users are new accounts that signed in from it. Opens are browsers that landed on it, counted once.
      </p>
      <div className="mt-3 flex flex-col gap-3">
        <form
          className="rounded-3xl border border-line bg-surface px-4 py-4"
          onSubmit={(event) => {
            event.preventDefault();
            void create();
          }}
        >
          <label htmlFor="campaign-name" className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">
            Name
          </label>
          <input
            id="campaign-name"
            value={name}
            maxLength={60}
            placeholder="Instagram October"
            onChange={(event) => {
              setName(event.target.value);
              if (message) setMessage(null);
            }}
            className="mt-2 block h-12 w-full appearance-none rounded-2xl bg-background px-4 text-[16px] text-foreground outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-accent"
          />
          {message && (
            <p role="alert" className="mt-3 text-[13px] leading-snug text-danger">
              {message}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || name.trim().length === 0}
            aria-busy={busy}
            className="mt-4 h-12 w-full rounded-full bg-accent text-[16px] font-semibold text-accent-ink transition-transform duration-150 ease-out active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create link"}
          </button>
        </form>

        {campaigns.length === 0 ? (
          <p className="text-[15px] text-muted">No campaigns yet.</p>
        ) : (
          <div className="@container overflow-x-auto overscroll-x-contain rounded-3xl border border-line bg-surface">
            <ul className="w-max min-w-full divide-y divide-line">
              {campaigns.map((campaign) => (
                <li key={campaign.slug} className="px-4 py-3">
                  <div className="flex w-full items-baseline justify-between gap-4 whitespace-nowrap">
                    <p className="text-[15px] font-medium">{campaign.name}</p>
                    <p className="shrink-0 text-[15px] font-semibold tabular-nums">{usersLabel(campaign.users)}</p>
                  </div>
                  <p className="mt-1 font-mono text-[12px] whitespace-nowrap text-muted">{campaignPath(campaign.slug)}</p>
                  <div className="mt-1 flex items-center justify-between gap-4 whitespace-nowrap">
                    <p className="text-[13px] text-muted">
                      {campaign.opened.toLocaleString("en-US")} opened the link
                    </p>
                    <button
                      type="button"
                      onClick={() => void copyLink(campaign.slug)}
                      className="inline-flex min-h-11 shrink-0 items-center text-[13px] font-medium text-foreground"
                    >
                      {copied === campaign.slug ? "Copied" : "Copy link"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
