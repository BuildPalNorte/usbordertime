/**
 * TEMPORARY. Candidate public camera pages for CBP land ports, gathered by web search on 2026-10-12.
 * Nothing here is wired into the app. It only feeds `/camera-lab` so a person can review each source.
 *
 * `embed` comes from probing each page's response headers:
 * - "open": no frame restriction seen, so an iframe may work.
 * - "blocked": `X-Frame-Options` or CSP `frame-ancestors` forbids embedding. Open it in a new tab instead.
 * - "unknown": the probe was refused (403) or returned nothing, so we cannot say.
 */

export type EmbedStatus = "open" | "blocked" | "unknown";

export type CameraSource = {
  label: string;
  url: string;
  /** Run by the bridge, city, or a DOT, as opposed to an aggregator or hobby site. */
  official: boolean;
  embed: EmbedStatus;
  note?: string;
};

export type CameraGroup = {
  id: string;
  name: string;
  border: "Mexico" | "Canada";
  /** CBP port numbers this group covers. */
  ports: string[];
  sources: CameraSource[];
};

export const CAMERA_GROUPS: CameraGroup[] = [
  // ── Mexican border ──
  {
    id: "brownsville",
    name: "Brownsville (Gateway, B&M, Veterans, Los Indios)",
    border: "Mexico",
    ports: ["535501", "535502", "535503", "535504"],
    sources: [
      {
        label: "BorderTraffic: Brownsville / Matamoros",
        url: "https://www.bordertraffic.com/Michigan-Ontario/Brownsville-Matamoros.aspx",
        official: false,
        embed: "open",
        note: "Lists every bridge and lane. Some views may need a paid account.",
      },
      {
        label: "Comtodo: Express Bridge camera",
        url: "https://comtodo.com/en/cameras/",
        official: false,
        embed: "blocked",
        note: "Mon–Fri 7:30–17:30, Sat 8:30–13:00 (Matamoros time).",
      },
    ],
  },
  {
    id: "laredo",
    name: "Laredo (Bridges I–IV, World Trade, Colombia)",
    border: "Mexico",
    ports: ["230401", "230402", "230403", "230404"],
    sources: [
      {
        label: "City of Laredo bridge cameras",
        url: "https://www.cityoflaredo.com/departments/bridge-system/bridge-cameras",
        official: true,
        embed: "unknown",
        note: "Refused our probe (403). Try the preview.",
      },
      {
        label: "Port Laredo: camera images",
        url: "https://portlaredo.com/border-crossing/",
        official: true,
        embed: "blocked",
      },
      {
        label: "Colombia Solidarity Bridge cameras",
        url: "https://www.puentecolombia.mx/en/cameras-of-colombia-bridge/",
        official: true,
        embed: "open",
      },
    ],
  },
  {
    id: "rgv",
    name: "Hidalgo, Anzalduas, Pharr",
    border: "Mexico",
    ports: ["230501", "230502", "230503"],
    sources: [
      {
        label: "City of McAllen: Hidalgo and Anzalduas",
        url: "https://mcallen.net/bridge-cameras/",
        official: true,
        embed: "blocked",
      },
      {
        label: "Pharr–Reynosa bridge camera",
        url: "https://bridge.pharr-tx.gov/live-bridge-camera/",
        official: true,
        embed: "open",
      },
    ],
  },
  {
    id: "eagle-pass",
    name: "Eagle Pass (Bridge I and II)",
    border: "Mexico",
    ports: ["230301", "230302"],
    sources: [
      {
        label: "City of Eagle Pass bridge cameras",
        url: "https://www.eaglepasstx.gov/307/International-Bridge-Cameras",
        official: true,
        embed: "blocked",
      },
    ],
  },
  {
    id: "del-rio",
    name: "Del Rio",
    border: "Mexico",
    ports: ["230201"],
    sources: [
      {
        label: "City of Del Rio: 24/7 live stream",
        url: "https://www.cityofdelrio.com/government/departments/international-bridge",
        official: true,
        embed: "unknown",
        note: "Refused our probe (403). Try the preview.",
      },
    ],
  },
  {
    id: "roma",
    name: "Roma",
    border: "Mexico",
    ports: ["231001", "231002"],
    sources: [
      {
        label: "SpotCameras: Roma–Miguel Alemán bridge",
        url: "https://spotcameras.com/en/cams/United-States/Texas/20924-Roma-Starr-County-Texas-USA-View-of-the-Roma%E2%80%93Ciudad-Miguel-Alem%C3%A1n-International-Bridge-and-the-river-Rio-Grande-on-the-US-Mexico-border",
        official: false,
        embed: "open",
      },
    ],
  },
  {
    id: "el-paso",
    name: "El Paso region (PDN, Ysleta, BOTA, Stanton, Tornillo, Santa Teresa)",
    border: "Mexico",
    ports: ["240201", "240202", "240203", "240204", "240207", "240221", "240401", "240801", "202401", "240104"],
    sources: [
      {
        label: "City of El Paso: Stanton, PDN, Zaragoza",
        url: "https://www2.elpasotexas.gov/misc/externally_linked/bridges/cams.html",
        official: true,
        embed: "blocked",
        note: "Images refresh every 18 seconds. An older city page said feeds were in maintenance.",
      },
      {
        label: "PDN Uno: six El Paso region crossings",
        url: "https://pdnuno.com/",
        official: true,
        embed: "blocked",
      },
      {
        label: "Fila de Puentes: Juárez–El Paso cameras",
        url: "https://filadepuentes.com/en/cameras",
        official: false,
        embed: "blocked",
      },
    ],
  },
  {
    id: "nogales",
    name: "Nogales (Mariposa, DeConcini)",
    border: "Mexico",
    ports: ["260401", "260402", "260403"],
    sources: [
      {
        label: "Nogales municipal webcams",
        url: "https://heroicanogales.gob.mx/webcams-garitas",
        official: true,
        embed: "blocked",
        note: "Four new Mariposa cameras added April 2026.",
      },
    ],
  },
  {
    id: "douglas",
    name: "Douglas",
    border: "Mexico",
    ports: ["260101"],
    sources: [
      {
        label: "City of Douglas: border traffic stream",
        url: "https://www.douglasaz.gov/623/Border-Traffic",
        official: true,
        embed: "unknown",
        note: "The city calls this a trial and may take it offline.",
      },
    ],
  },
  {
    id: "san-luis",
    name: "San Luis",
    border: "Mexico",
    ports: ["260801", "260802"],
    sources: [
      {
        label: "Traffic-cams.com: CBP San Luis cam",
        url: "https://www.traffic-cams.com/san-luis/arizona/feed1660432145didkey349678",
        official: false,
        embed: "open",
      },
    ],
  },
  {
    id: "san-diego",
    name: "San Ysidro and Otay Mesa",
    border: "Mexico",
    ports: ["250401", "250407", "250409", "250601", "250602", "250608", "250609"],
    sources: [
      {
        label: "BorderCam: 35+ lane cameras",
        url: "https://www.bordercam.cam/en",
        official: false,
        embed: "open",
        note: "App-based. The web page may only be a landing page.",
      },
      {
        label: "Fila de Puentes: San Ysidro and Otay (Caltrans)",
        url: "https://filadepuentes.com/en/cameras/tijuana",
        official: false,
        embed: "blocked",
      },
    ],
  },
  {
    id: "calexico",
    name: "Calexico (East and West)",
    border: "Mexico",
    ports: ["250301", "250302"],
    sources: [
      {
        label: "BorderTraffic: Calexico / Mexicali",
        url: "https://www.bordertraffic.com/California-Baja/Calexico-Mexicali.aspx",
        official: false,
        embed: "open",
      },
      {
        label: "Fila de Puentes: Mexicali (Caltrans)",
        url: "https://filadepuentes.com/en/crossings/mexicali",
        official: false,
        embed: "blocked",
      },
    ],
  },

  // ── Canadian border ──
  {
    id: "detroit",
    name: "Detroit (Ambassador, Gordie Howe, Windsor Tunnel)",
    border: "Canada",
    ports: ["380001", "380102", "380002"],
    sources: [
      {
        label: "Ambassador Bridge: into the U.S. camera",
        url: "https://www.ambassadorbridge.com/into-the-united-states/",
        official: true,
        embed: "unknown",
        note: "Refused our probe (403). The into-Canada cam says “Coming Soon”.",
      },
      {
        label: "Windsor–Detroit Border Times: camera roundup",
        url: "https://windsordetroitbordertimes.com/cameras/",
        official: false,
        embed: "blocked",
        note: "Gordie Howe has no public camera yet. Nearby highway cams only.",
      },
    ],
  },
  {
    id: "niagara",
    name: "Buffalo / Niagara Falls (Peace, Rainbow, Lewiston, Whirlpool)",
    border: "Canada",
    ports: ["090101", "090102", "090103", "090104"],
    sources: [
      {
        label: "NITTEC: Lewiston–Queenston Bridge",
        url: "https://www.nittec.org/cameras/index.html?cid=1021",
        official: true,
        embed: "blocked",
      },
      {
        label: "NITTEC: Queenston Plaza",
        url: "https://www.nittec.org/cameras/index.html?cid=1022",
        official: true,
        embed: "blocked",
      },
      {
        label: "NITTEC: Rainbow Bridge",
        url: "https://www.nittec.org/cameras/index.html?cid=1011",
        official: true,
        embed: "blocked",
      },
      {
        label: "Peace Bridge Authority: traffic cameras",
        url: "https://www.peacebridge.com/media-room/traffic-cameras/",
        official: true,
        embed: "blocked",
      },
      {
        label: "Niagara Falls Bridge Commission: traffic",
        url: "https://www.niagarafallsbridges.com/services/traffic-conditions",
        official: true,
        embed: "blocked",
      },
    ],
  },
  {
    id: "port-huron",
    name: "Port Huron (Blue Water Bridge)",
    border: "Canada",
    ports: ["380201"],
    sources: [
      {
        label: "Blue Water Bridge: traffic cameras",
        url: "https://bluewaterbridge.ca/traffic/",
        official: true,
        embed: "blocked",
      },
    ],
  },
  {
    id: "pacific-nw",
    name: "Blaine, Lynden, Sumas (Peace Arch, Pacific Highway)",
    border: "Canada",
    ports: ["300401", "300402", "300403", "302301", "300901"],
    sources: [
      {
        label: "WSDOT: border crossing cameras",
        url: "https://wsdot.wa.gov/travel/roads-bridges/border-crossings",
        official: true,
        embed: "blocked",
        note: "16 cameras across the four crossings.",
      },
      {
        label: "DriveBC: Peace Arch camera",
        url: "https://www.drivebc.ca/cameras/13",
        official: true,
        embed: "unknown",
      },
    ],
  },
  {
    id: "northern-aggregators",
    name: "Champlain, Highgate Springs, Derby Line, Pembina, Sweetgrass, Massena, Houlton, Madawaska",
    border: "Canada",
    ports: ["071201", "021201", "020901", "340101", "331001", "070401", "010601", "L01901"],
    sources: [
      {
        label: "BorderLineups: live cameras",
        url: "https://www.borderlineups.com/",
        official: false,
        embed: "open",
        note: "Aggregates DOT cameras. Mostly approach roads, not the plaza.",
      },
      {
        label: "BorderLineups: Champlain",
        url: "https://www.borderlineups.com/ports/champlain-rouses-point",
        official: false,
        embed: "open",
      },
      {
        label: "BorderWaits: camera list",
        url: "https://www.borderwaits.com/cameras",
        official: false,
        embed: "blocked",
      },
    ],
  },
  {
    id: "sault",
    name: "Sault Ste. Marie and Thousand Islands",
    border: "Canada",
    ports: ["380301", "070801"],
    sources: [
      {
        label: "Sault webcam (waterfront and bridge)",
        url: "https://saultwebcam.com/",
        official: false,
        embed: "open",
      },
    ],
  },
];

/** Ports where searches found no public camera at all. */
export const NO_CAMERA_FOUND: string[] = [
  "Progreso / Donna",
  "Rio Grande City",
  "Presidio",
  "Columbus",
  "Fort Hancock",
  "Naco",
  "Lukeville",
  "Andrade",
  "Tecate",
  "Windsor Tunnel",
  "Whirlpool Bridge",
  "Point Roberts",
  "Calais",
  "Ogdensburg",
  "Norton",
  "International Falls",
  "Jackman",
];
