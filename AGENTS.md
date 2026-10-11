<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## How this app fits together

Border Time shows live U.S. land-port wait times from the public CBP feed. The home page stays on the sign-in screen until Google sign-in succeeds through Better Auth in this app (`lib/auth`). That visit upserts `profile` (id, email, name, image), keyed to the auth user. A profile created on that visit still owes an answer for how they found the app (`referral`); the bridges stay behind that question until they pick one. Later visits do not ask again, and accounts that already existed are not asked. Saved crossings, city bookmarks, the language choice, and the appearance choice are saved on that account's `preference` row and mirrored in the browser. The browser copy, plus the language and appearance cookies, lets the next visit render before the account is read. The Ask tab (`/ask`) sends a signed-in rider's question to OpenAI, with the live snapshot as context. A spoken question is turned into text by the browser first; only that text is sent. Wait alerts (`wait_alert`) and each device's push address (`push_subscription`) are kept per account. Schedules (`schedule`: a time, days, a lane, a set of bridges, and an optional name) are kept per account too. A once-a-minute cron compares alerts with the cached snapshot, sends the schedules that are due, and sends Web Push. Visit streaks (`streak`: current run, longest run, total days, last day) are kept per account. `StreakSync` posts to `/api/streak` once per local day, using the browser's time zone, and `lib/streak.ts` holds the day math. The current Nuevo and Viejo playlist addresses live in `camera_stream`, shared across accounts. `getCameraStreams()` caches them until a 404 lookup replaces the row.

Before changing a seam, read the matching rule in `.cursor/rules/`. Each one is the short version of how that code works.

| If you are changing… | Read |
| --- | --- |
| The CBP fetch, cache, or `/api/wait-times` | `cbp-feed.mdc` |
| Lane modes, wait colors, or crossing names | `lanes.mdc` |
| The wallet or city bookmarks | `saved-state.mdc` |
| English or Spanish copy, the locale, or appearance | `copy.mdc` |
| The wallet screen, cards, motion, or live cameras | `wallet-ui.mdc` |
| Wait alerts, push notifications, the cron check, or Home Screen install | `alerts.mdc` |
| Who can open `/admin` | `admin.mdc` |
| The Ask tab, its chat or voice input, or the AI's knowledge | `ask.mdc` |

Data moves one way. `getBorderWaitTimes()` normalizes `https://bwt.cbp.gov/api/waittimes`. The home page passes that snapshot into `WalletApp`. The client refetches `GET /api/wait-times` about once a minute. Search and the Mexico/Canada filter run on that snapshot in the browser. They do not call the API again.

`lib/ports.ts` and the `*-store.ts` modules are client-safe. Do not import `next/cache`, `next/headers`, or other server-only modules into them.

This repo uses Next.js 16 with `cacheComponents` enabled, and pnpm. Before using a Next.js API, read the matching guide in `node_modules/next/dist/docs/`.
