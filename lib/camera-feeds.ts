/**
 * Direct camera feeds found behind public camera pages (2026-10-12), keyed to CBP ports.
 * `feedsForPort` is what the bridge view reads. Client-safe: no server imports.
 * Feeds the browser cannot read directly (CORS-locked or hotlink-checked) go through
 * `/api/camera-proxy`, which only serves the hosts in `PROXY_HOSTS`.
 */

export type FeedKind = "hls" | "image" | "embed";

export type Feed = {
  id: string;
  label: string;
  kind: FeedKind;
  src: string;
  /** Seconds between image reloads. */
  refreshSec?: number;
  /** Send hls/image through `/api/camera-proxy` (CORS-locked or hotlink-checked sources). */
  proxy?: boolean;
  official: boolean;
  /** CBP port this feed watches. Falls back to the group's ports. */
  port?: string;
  /** Overrides the group's provider and page when a group mixes sources. */
  provider?: string;
  page?: string;
};

export type FeedGroup = {
  id: string;
  name: string;
  border: "Mexico" | "Canada";
  ports: string[];
  /** Who runs the cameras, as shown under the picture. */
  provider: string;
  /** Page the feed came from. */
  source: string;
  feeds: Feed[];
};

/** Hosts the proxy will fetch, mapped to the Referer that site expects. */
export const PROXY_HOSTS: Record<string, string> = {
  "cruce.heroicanogales.gob.mx": "https://heroicanogales.gob.mx/",
  "www.openlaredo.com": "https://www.openlaredo.com/",
  "ambassador.solutionspal.com": "https://www.ambassadorbridge.com/",
  "wtbwb.ca": "https://bluewaterbridge.ca/",
  "images.wsdot.wa.gov": "https://wsdot.wa.gov/",
  "cameras.sibc.ca": "https://www.drivebc.ca/",
};

const nogales = (crossing: "deconcini" | "mariposa", path: string, label: string): Feed => ({
  id: `nogales-${crossing}-${path}`,
  label,
  kind: "hls",
  src: `https://cruce.heroicanogales.gob.mx/${crossing}/${path}/index.m3u8`,
  proxy: true,
  official: true,
});

const laredo = (bridge: number, side: "US" | "MEX", label: string): Feed => ({
  id: `laredo-${bridge}-${side}`,
  port: `23040${bridge}`,
  label,
  kind: "image",
  src: `https://www.openlaredo.com/bridge/BridgeWebCamStills/bridge${bridge}${side}.jpg`,
  refreshSec: 30,
  proxy: true,
  official: true,
});

const wsdot = (code: string, label: string): Feed => ({
  id: `wsdot-${code}`,
  label,
  kind: "image",
  src: `https://images.wsdot.wa.gov/nw/${code}.jpg`,
  refreshSec: 60,
  proxy: true,
  official: true,
});

export const FEED_GROUPS: FeedGroup[] = [
  {
    id: "nogales-mariposa",
    provider: "Gobierno Municipal de Nogales",
    name: "Nogales: Mariposa",
    border: "Mexico",
    ports: ["260402"],
    source: "https://heroicanogales.gob.mx/webcams-garitas",
    feeds: [
      nogales("mariposa", "general", "Mariposa"),
      nogales("mariposa", "mariposa3", "Caffenio Norte"),
      nogales("mariposa", "mariposa4", "Caffenio Sur"),
      nogales("mariposa", "mariposa5", "Pima Norte"),
      nogales("mariposa", "mariposa6", "Pima Sur"),
    ],
  },
  {
    id: "nogales-deconcini",
    provider: "Gobierno Municipal de Nogales",
    name: "Nogales: DeConcini",
    border: "Mexico",
    ports: ["260401"],
    source: "https://heroicanogales.gob.mx/webcams-garitas",
    feeds: [
      nogales("deconcini", "norte", "Vista Norte"),
      nogales("deconcini", "sur", "Vista Sur"),
      nogales("deconcini", "ban-nor", "BBVA Norte"),
      nogales("deconcini", "ban-sur", "BBVA Sur"),
      nogales("deconcini", "san-nor", "Santander Norte"),
      nogales("deconcini", "san-sur", "Santander Sur"),
      nogales("deconcini", "hot-nor", "Acceso Sentri"),
      nogales("deconcini", "hot-sur", "Sentri Sur"),
      nogales("deconcini", "pla-nor", "Plaza Hidalgo Norte"),
      nogales("deconcini", "pla-sur", "Plaza Hidalgo Sur"),
      nogales("mariposa", "general2", "Plaza Hidalgo Sur (2)"),
    ],
  },
  {
    id: "laredo",
    provider: "City of Laredo Bridge System",
    name: "Laredo: Bridges I–IV",
    border: "Mexico",
    ports: ["230401", "230402", "230403", "230404"],
    source: "https://portlaredo.com/border-crossing/",
    feeds: [
      laredo(1, "US", "Bridge I, U.S. side"),
      laredo(1, "MEX", "Bridge I, Mexico side"),
      laredo(2, "US", "Bridge II, U.S. side"),
      laredo(2, "MEX", "Bridge II, Mexico side"),
      laredo(3, "US", "Bridge III (Colombia), U.S. side"),
      laredo(3, "MEX", "Bridge III (Colombia), Mexico side"),
      laredo(4, "US", "Bridge IV (World Trade), U.S. side"),
      laredo(4, "MEX", "Bridge IV (World Trade), Mexico side"),
    ],
  },
  {
    id: "colombia",
    provider: "Puente Colombia",
    name: "Colombia Solidarity Bridge toll booth",
    border: "Mexico",
    ports: ["230403"],
    source: "https://www.puentecolombia.mx/en/cameras-of-colombia-bridge/",
    // YaDZE5ba is "turned off by its owner" on rtsp.me, so it is left out.
    feeds: ["94RBHiAa", "9edK9h5t", "QsYGTyyQ"].map((id, index) => ({
      id: `colombia-${id}`,
      label: `Toll booth camera ${index + 2}`,
      kind: "embed" as const,
      src: `https://rtsp.me/embed/${id}/`,
      official: true,
    })),
  },
  {
    id: "ambassador",
    provider: "Detroit International Bridge Company",
    name: "Ambassador Bridge (Detroit)",
    border: "Canada",
    ports: ["380001"],
    source: "https://www.ambassadorbridge.com/live-cameras/",
    feeds: [
      {
        id: "ambassador-1",
        label: "Traffic into the U.S.",
        kind: "image",
        src: "https://ambassador.solutionspal.com/cams/camimage.jpg",
        refreshSec: 30,
        proxy: true,
        official: true,
      },
      {
        id: "ambassador-2",
        label: "Second view",
        kind: "image",
        src: "https://ambassador.solutionspal.com/cams/camimage2.jpg",
        refreshSec: 30,
        proxy: true,
        official: true,
      },
    ],
  },
  {
    id: "blue-water",
    provider: "Blue Water Bridge",
    name: "Blue Water Bridge (Port Huron)",
    border: "Canada",
    ports: ["380201"],
    source: "https://bluewaterbridge.ca/traffic/",
    feeds: [
      {
        id: "bwb-1",
        label: "Approach",
        kind: "image",
        src: "https://wtbwb.ca/approach.jpg",
        refreshSec: 60,
        proxy: true,
        official: true,
      },
      {
        id: "bwb-2",
        label: "Approach 2",
        kind: "image",
        src: "https://wtbwb.ca/approach2.jpg",
        refreshSec: 60,
        proxy: true,
        official: true,
      },
    ],
  },
  {
    id: "blaine",
    provider: "WSDOT and DriveBC",
    name: "Blaine: Peace Arch (WSDOT, DriveBC)",
    border: "Canada",
    ports: ["300402"],
    source: "https://wsdot.wa.gov/travel/roads-bridges/border-crossings",
    feeds: [
      wsdot("005vc27416", "I-5 near MP 274.2"),
      wsdot("005vc27512", "I-5 near MP 275.1"),
      wsdot("005vc27556", "I-5 near MP 275.6"),
      wsdot("005vc27613", "I-5 near MP 276.1"),
      wsdot("005vc27623", "I-5 near MP 276.2"),
      wsdot("005vc27650", "I-5 near MP 276.5"),
      {
        id: "drivebc-south",
        provider: "DriveBC",
        page: "https://www.drivebc.ca/cameras/13",
        label: "DriveBC south of border",
        kind: "image",
        src: "https://cameras.sibc.ca/south/snap_c1.jpg",
        refreshSec: 60,
        proxy: true,
        official: true,
      },
      {
        id: "drivebc-north",
        provider: "DriveBC",
        page: "https://www.drivebc.ca/cameras/13",
        label: "DriveBC north of border",
        kind: "image",
        src: "https://cameras.sibc.ca/north/snap_c1.jpg",
        refreshSec: 60,
        proxy: true,
        official: true,
      },
    ],
  },
  {
    id: "sumas",
    provider: "WSDOT",
    name: "Sumas (WSDOT SR 9)",
    border: "Canada",
    ports: ["300901"],
    source: "https://wsdot.wa.gov/travel/roads-bridges/border-crossings",
    feeds: [
      wsdot("009vc09686", "SR 9 near MP 96.9"),
      wsdot("009vc09750", "SR 9 near MP 97.5"),
      wsdot("009vc09781", "SR 9 near MP 97.8"),
      wsdot("009vc09816", "SR 9 near MP 98.2"),
    ],
  },
];

export type CrossingFeed = Feed & { provider: string; page: string };

export function allFeeds(): Feed[] {
  return FEED_GROUPS.flatMap((group) => group.feeds);
}

/** Addresses in code, used until `camera_feed` has a row for that id. */
export function fallbackFeedAddresses(): Record<string, string> {
  return Object.fromEntries(allFeeds().map((feed) => [feed.id, feed.src]));
}

/** The cameras that watch one CBP port, in the order they are listed here. */
export function feedsForPort(portNumber: string): CrossingFeed[] {
  return FEED_GROUPS.flatMap((group) =>
    group.feeds
      .filter((feed) => (feed.port ? feed.port === portNumber : group.ports.includes(portNumber)))
      .map((feed) => ({
        ...feed,
        provider: feed.provider ?? group.provider,
        page: feed.page ?? group.source,
      })),
  );
}

/** Crossings whose pages exist but only render the video inside a login, app, or private network. */
export const NO_DIRECT_FEED: { name: string; why: string; page: string }[] = [
  { name: "Pharr–Reynosa bridge", why: "Only a YouTube clip that is not a continuous live stream.", page: "https://bridge.pharr-tx.gov/live-bridge-camera/" },
  { name: "El Paso (Stanton, PDN, Zaragoza)", why: "City cameras are plain-HTTP Axis units that did not answer from here.", page: "https://www2.elpasotexas.gov/misc/externally_linked/bridges/cams.html" },
  { name: "Hidalgo and Anzalduas", why: "Behind a camera-server login (cameras.mcallen.net).", page: "https://mcallen.net/bridge-cameras/" },
  { name: "Eagle Pass, Del Rio", why: "City pages block automated requests, so the stream address was not visible.", page: "https://www.eaglepasstx.gov/307/International-Bridge-Cameras" },
  { name: "San Ysidro, Otay Mesa, Calexico, Brownsville lanes", why: "Paid apps (BorderCam, BorderTraffic). The video is not public. The Caltrans snapshots near the ports currently show a \"Temporarily Unavailable\" image.", page: "https://www.bordertraffic.com/" },
  { name: "Niagara (Peace, Rainbow, Lewiston)", why: "NITTEC and 511 image addresses returned a placeholder image.", page: "https://www.nittec.org/cameras/index.html?cid=1021" },
  { name: "Champlain, Highgate, Derby Line, Pembina, Sweetgrass", why: "Only 511 images, which returned a placeholder without a browser session.", page: "https://www.borderlineups.com/" },
];
