# Border Time

Open source live wait times for U.S. land ports of entry. Save the bridges you cross, then see passenger, Ready, SENTRI or NEXUS, pedestrian, truck, and FAST lanes in one wallet.

Border Time reads the public [U.S. Customs and Border Protection border wait times feed](https://bwt.cbp.gov/) and presents it for the Mexican and Canadian borders. The interface is in English and Spanish. Saved crossings and city bookmarks stay in the browser. There is no account.

Repository: [github.com/BuildPalNorte/usbordertime](https://github.com/BuildPalNorte/usbordertime)

## What you can do

- Browse every crossing CBP reports, and filter by Mexico, Canada, or both.
- Search by city, bridge, or port number.
- Keep a wallet of the crossings you use. The wallet is stored in `localStorage` on this device.
- Bookmark a city so its crossings stay at the top of the wallet.
- Switch lane type on a crossing and see the wait, how many lanes are open, hours, port status, and any construction notice CBP published.
- Refresh automatically about once a minute. You can also refresh by hand.

Wait colors follow the delay CBP reports:

| Wait | Label |
| --- | --- |
| 15 minutes or less | Clear |
| 16–45 minutes | Moderate |
| More than 45 minutes | Long wait |

Closed ports, closed lanes, and crossings that do not publish a lane type are labeled as such. Border Time does not measure the line. If CBP has not posted a number, the app says so.

## Data

The server fetches `https://bwt.cbp.gov/api/waittimes`, drops entries that are missing a port number or name, and normalizes lane groups into a stable shape. That snapshot is cached for a few minutes. The browser asks `/api/wait-times` again every 60 seconds.

Field names, status strings, and the normalized shape are written up in [docs/cbp-wait-times.md](docs/cbp-wait-times.md).

CBP owns the wait times. Their notices are shown in the language CBP published, which is English.

## API

`GET /api/wait-times`

Optional query parameters:

| Parameter | Values | Effect |
| --- | --- | --- |
| `border` | `mexican` or `canadian` | Limit to one border. |
| `port` | text | Match port number, port name, or crossing name. |

```bash
curl "http://localhost:3000/api/wait-times?border=mexican&port=brownsville"
```

A successful response looks like this:

```json
{
  "fetchedAt": "2026-10-10T18:00:00.000Z",
  "source": "https://bwt.cbp.gov/api/waittimes",
  "count": 1,
  "ports": []
}
```

Each port includes commercial, passenger, and pedestrian lane groups. A lane reading has `operationalStatus`, `delayMinutes`, `lanesOpen`, and `updateTime`.

`border` must be `mexican` or `canadian`. Anything else returns `400`. If the CBP feed fails or comes back empty, the route returns `502`. Responses are cached for 60 seconds and may be served stale for up to five minutes while a fresh copy is fetched.

## Requirements

- Node.js 20.9 or newer
- [pnpm](https://pnpm.io/) 10 (`packageManager` is set to `pnpm@10.20.0`)

## Develop

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

| Script | What it does |
| --- | --- |
| `pnpm dev` | Start the Next.js dev server. |
| `pnpm build` | Production build. |
| `pnpm start` | Serve the production build. |
| `pnpm lint` | Run ESLint. |

No environment variables are required. The app talks to the public CBP feed directly.

## Stack

[Next.js](https://nextjs.org/) 16, React 19, TypeScript, Tailwind CSS 4, [HeroUI](https://heroui.com/), TanStack Query, and Motion.

## Layout

```
app/                      pages, layout, and the wait-times route
app/api/wait-times/       JSON API over the cached CBP snapshot
components/wallet/        wallet, browse list, cards, and tab bar
lib/border-wait-times.ts  fetch and normalize the CBP payload
lib/ports.ts              lane selection, names, and wait color
lib/i18n.ts               English and Spanish copy
lib/wallet-store.ts       saved crossings in localStorage
lib/pin-store.ts          bookmarked cities in localStorage
```

On a phone, Wallet and Browse are separate tabs. On a wide screen both panes stay on the page.

## License

[MIT](LICENSE). You can use, change, and share this project if you keep the copyright notice.

## Contributing

Issues and pull requests are welcome on [GitHub](https://github.com/BuildPalNorte/usbordertime).

When you change the UI, check both English and Spanish, and try a crossing that is open, one that is closed, and one that does not offer the lane you are looking at.
