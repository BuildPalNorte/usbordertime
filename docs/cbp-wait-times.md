# CBP border wait times

Border Time reads one public endpoint and reshapes it before anything else in the app sees it. This note is the field guide for that payload: what CBP returns, which strings actually show up, and what `getBorderWaitTimes()` turns them into.

Checked against a live response on 10 October 2026 (85 crossings: 55 Mexican, 30 Canadian). Counts move. The field names and the status vocabulary below are the stable part.

## Where it enters the app

`getBorderWaitTimes()` in `lib/border-wait-times.ts` is the only fetch.

```
GET https://bwt.cbp.gov/api/waittimes
Accept: application/json
User-Agent: usbordertime
```

No key, no query string. The body is a JSON array, one object per crossing. A non-array body, an HTTP error, or an array that normalizes to zero ports throws `BorderWaitTimesError`. The call times out after 15 seconds.

The function is cached with `"use cache"` and `cacheLife("minutes")`. Do not add a second fetch. `app/page.tsx` passes that snapshot in as `initial`. If the fetch throws, the page still renders and the client retries. `GET /api/wait-times` serves the same cached snapshot, optionally filtered, with `Cache-Control: public, max-age=60, stale-while-revalidate=300`.

| Query | Effect |
| --- | --- |
| `border` | Omit it, or pass `mexican` or `canadian`. Anything else is `400`. |
| `port` | Case-insensitive match on port number, port name, or crossing name. |

The wallet calls `/api/wait-times` with no query. Mexico, Canada, and search run in the browser on the snapshot it already has.

Our response adds `fetchedAt`, `source`, and `count` around the normalized `ports` array. A CBP failure or an empty feed is `502` with `{ "error": "..." }`.

## Raw crossing

Every element has the same twelve keys. Every scalar is a string, including the numbers. There is no `null` in the feed. Missing data is `""` or `"N/A"`.

```json
{
  "port_number": "070801",
  "border": "Canadian Border",
  "port_name": "Alexandria Bay",
  "crossing_name": "Thousand Islands Bridge",
  "hours": "24 hrs/day",
  "date": "10/10/2026",
  "time": "20:13:19",
  "port_status": "Open",
  "commercial_vehicle_lanes": {
    "maximum_lanes": "5",
    "standard_lanes": {
      "update_time": "At 8:00 pm EDT",
      "operational_status": "no delay",
      "delay_minutes": "0",
      "lanes_open": "1"
    },
    "FAST_lanes": {
      "update_time": "",
      "operational_status": "N/A",
      "delay_minutes": "",
      "lanes_open": ""
    }
  },
  "passenger_vehicle_lanes": {
    "maximum_lanes": "8",
    "standard_lanes": {
      "update_time": "At 8:00 pm EDT",
      "operational_status": "no delay",
      "delay_minutes": "0",
      "lanes_open": "2"
    },
    "NEXUS_SENTRI_lanes": {
      "update_time": "",
      "operational_status": "Lanes Closed",
      "delay_minutes": "",
      "lanes_open": ""
    },
    "ready_lanes": {
      "update_time": "",
      "operational_status": "N/A",
      "delay_minutes": "",
      "lanes_open": ""
    }
  },
  "pedestrian_lanes": {
    "maximum_lanes": "N/A",
    "standard_lanes": {
      "update_time": "",
      "operational_status": "N/A",
      "delay_minutes": "",
      "lanes_open": ""
    },
    "ready_lanes": {
      "update_time": "",
      "operational_status": "N/A",
      "delay_minutes": "",
      "lanes_open": ""
    }
  },
  "construction_notice": ""
}
```

A crossing with a posted wait looks like this on the lane that has one. `operational_status` flips to `"delay"` and `delay_minutes` is the wait:

```json
"standard_lanes": {
  "update_time": "At 8:08 pm EDT",
  "operational_status": "delay",
  "delay_minutes": "10",
  "lanes_open": "3"
}
```

When CBP has not posted numbers yet, the lane stays present and the counts stay empty:

```json
"standard_lanes": {
  "update_time": "",
  "operational_status": "Update Pending",
  "delay_minutes": "",
  "lanes_open": ""
}
```

## Fields

| Field | What it is |
| --- | --- |
| `port_number` | Stable id for the crossing. Usually six digits (`230401`). Treat it as an opaque string: `L01901` (Madawaska) and `l24501` (Fort Hancock) are real ids, and the letter case differs. This is what saved crossings and card colors key on. |
| `border` | `"Mexican Border"` or `"Canadian Border"`. The app's `mexican` / `canadian` query maps onto these two strings. |
| `port_name` | CBP's name, usually a city or port, usually uppercase. One name covers every bridge in that city, so it repeats. |
| `crossing_name` | The bridge or gate when the port has more than one. Often `""`, often the same text as `port_name`, and sometimes padded with spaces. Brownsville's rows are `port_name: "Brownsville"` with crossings `B&M`, `Gateway`, `Los Indios`, `Veterans International`. |
| `hours` | A short English phrase, not a schedule. Seen values include `24 hrs/day`, `6 am-10 pm`, `6 am-Midnight`, `8 am-4 pm`. |
| `date` | `MM/DD/YYYY` in the port's local time. |
| `time` | `HH:MM:SS` in the port's local time. This is when CBP assembled the row, not when the lane was last measured. Ports in one response do not share a clock: a Pacific row can read `17:13` while an Eastern row in the same array reads `20:13`. |
| `port_status` | `"Open"` or `"Closed"`. A closed port still includes all three lane groups. |
| `construction_notice` | Free English text from CBP, or `""`. It can contain newlines, trailing spaces, and URLs. The app shows it as published. It is not translated. |
| `commercial_vehicle_lanes` | Trucks. Keys: `maximum_lanes`, `standard_lanes`, `FAST_lanes`. |
| `passenger_vehicle_lanes` | Cars. Keys: `maximum_lanes`, `standard_lanes`, `NEXUS_SENTRI_lanes`, `ready_lanes`. |
| `pedestrian_lanes` | People on foot. Keys: `maximum_lanes`, `standard_lanes`, `ready_lanes`. |

Lane groups are always present, and each lane object always has the same four keys. `FAST_lanes` is commercial only. `NEXUS_SENTRI_lanes` is passenger only. Pedestrian Ready is its own lane (`pedestrian_lanes.ready_lanes`); the wallet does not have a mode for it, but the normalizer keeps it on `pedestrian.ready`.

`maximum_lanes` is a digit string or `"N/A"` when that whole group is not offered at the crossing. It is the capacity of the group, shared by every lane inside it, not a per-lane cap.

### Lane object

| Field | Values |
| --- | --- |
| `operational_status` | See below. Casing is not consistent. |
| `delay_minutes` | Digit string, or `""` when CBP did not post a number. `"0"` is a real zero. |
| `lanes_open` | Digit string, or `""`. |
| `update_time` | When that lane was last measured, or `""`. Shape: `At 8:08 pm EDT` — leading `At `, 12-hour clock, lowercase `am`/`pm`, then a US timezone abbreviation (`PDT`, `PST`, `MDT`, `MST`, `CDT`, `EDT`, `EST`). |

`operational_status` values seen on the live feed:

| Exact string | Meaning |
| --- | --- |
| `N/A` | This crossing does not publish that lane type. Counts are empty. |
| `Lanes Closed` | The lane exists and is shut. Counts are empty. |
| `Update Pending` | The lane exists and CBP has not posted numbers. Counts and `update_time` are empty. |
| `no delay` | Open. `delay_minutes` is often `"0"`, but it can be a small positive number (2–8 showed up in the sample). Do not treat the label as "zero minutes." |
| `delay` | Open, with a wait in `delay_minutes`. |

`readLane` in `lib/ports.ts` does not branch on `delay` versus `no delay`. Color comes from the number: 15 minutes or less is clear, 16–45 is moderate, above that is a long wait. `N/A` means the lane is not offered. `Lanes Closed`, or a `port_status` that does not match `/open/i`, means closed. A null minute count on an open lane is "update pending."

## What the app stores

`normalizePort` drops a row with no `port_number` or `port_name`. Empty strings on names and notices become `null`. `""` and `"N/A"` on counts become `null`, not `0`. A missing lane object becomes an empty reading: `operationalStatus: "N/A"` and null counts. A blank `operational_status` is stored as `"N/A"`.

| CBP | Normalized |
| --- | --- |
| `port_number` | `portNumber` |
| `border` | `border` |
| `port_name` | `portName` |
| `crossing_name` | `crossingName` |
| `hours` | `hours` |
| `date` | `date` |
| `time` | `time` |
| `port_status` | `portStatus` |
| `construction_notice` | `constructionNotice` |
| `commercial_vehicle_lanes` | `commercial` |
| `passenger_vehicle_lanes` | `passenger` |
| `pedestrian_lanes` | `pedestrian` |
| `maximum_lanes` | `maximumLanes` (`number` or `null`) |
| `standard_lanes` | `standard` |
| `FAST_lanes` | `commercial.fast` |
| `NEXUS_SENTRI_lanes` | `passenger.nexusSentri` |
| `ready_lanes` | `ready` |
| `operational_status` | `operationalStatus` |
| `delay_minutes` | `delayMinutes` (`number` or `null`) |
| `lanes_open` | `lanesOpen` (`number` or `null`) |
| `update_time` | `updateTime` (`string` or `null`) |

Each lane reading is `{ operationalStatus, delayMinutes, lanesOpen, updateTime }`.

Wallet modes read one lane each:

| Mode | Lane |
| --- | --- |
| `car` | `passenger.standard` |
| `ready` | `passenger.ready` |
| `sentri` | `passenger.nexusSentri` |
| `walk` | `pedestrian.standard` |
| `truck` | `commercial.standard` |
| `fast` | `commercial.fast` |

`portName()` in `lib/ports.ts` turns the uppercase CBP names into a title and subtitle. Cards use the crossing when it names a bridge, and the port name when the crossing is empty or generic (`East`, `West`, `Commercial`, `Passenger`, `PedWest`). Three Brownsville bridges show the local name instead: Veterans International is De los tomates, B&M is Viejo, and Gateway is Nuevo. Los Indios stays Los Indios.
