<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## How this app fits together

Border Time shows live U.S. land-port wait times from the public CBP feed. There is no account. Saved crossings, city bookmarks, the language choice, and the appearance choice stay in the browser.

Before changing a seam, read the matching rule in `.cursor/rules/`. Each one is the short version of how that code works.

| If you are changing… | Read |
| --- | --- |
| The CBP fetch, cache, or `/api/wait-times` | `cbp-feed.mdc` |
| Lane modes, wait colors, or crossing names | `lanes.mdc` |
| The wallet or city bookmarks | `saved-state.mdc` |
| English or Spanish copy, the locale, or appearance | `copy.mdc` |
| The wallet screen, cards, or motion | `wallet-ui.mdc` |

Data moves one way. `getBorderWaitTimes()` normalizes `https://bwt.cbp.gov/api/waittimes`. The home page passes that snapshot into `WalletApp`. The client refetches `GET /api/wait-times` about once a minute. Search and the Mexico/Canada filter run on that snapshot in the browser. They do not call the API again.

`lib/ports.ts` and the `*-store.ts` modules are client-safe. Do not import `next/cache`, `next/headers`, or other server-only modules into them.

This repo uses Next.js 16 with `cacheComponents` enabled, and pnpm. Before using a Next.js API, read the matching guide in `node_modules/next/dist/docs/`.
