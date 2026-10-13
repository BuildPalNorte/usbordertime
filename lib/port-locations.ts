import type { PortWaitTime } from "@/lib/border-wait-times";
import { portName } from "@/lib/ports";

/** Client-safe. No server imports. */

export type GeoPoint = { lat: number; lng: number };

/**
 * One point per CBP crossing city, keyed by `portName(port).city` lowercased.
 * Covers every city the feed has published. A city added later shows up here as
 * a missing key, not a wrong guess — `nearbyBridges` skips what it cannot place.
 */
const CITY_LOCATION: Record<string, GeoPoint> = {
  "alexandria bay": { lat: 44.3356, lng: -75.9199 },
  andrade: { lat: 32.7187, lng: -114.7122 },
  "b&m bridge": { lat: 25.8976, lng: -97.4897 },
  "bota cargo facility": { lat: 31.7067, lng: -106.4064 },
  blaine: { lat: 48.9975, lng: -122.7576 },
  "bridge of the americas": { lat: 31.7067, lng: -106.4064 },
  brownsville: { lat: 25.914, lng: -97.4891 },
  "buffalo/niagara falls": { lat: 42.9064, lng: -78.8847 },
  calais: { lat: 45.1807, lng: -67.2797 },
  calexico: { lat: 32.6789, lng: -115.4989 },
  champlain: { lat: 44.9864, lng: -73.4515 },
  columbus: { lat: 31.8273, lng: -107.6428 },
  "del rio": { lat: 29.348, lng: -100.8993 },
  "derby line": { lat: 45.0004, lng: -72.0968 },
  detroit: { lat: 42.3314, lng: -83.0458 },
  "douglas (raul hector castro)": { lat: 31.3375, lng: -109.5451 },
  "eagle pass": { lat: 28.7089, lng: -100.4942 },
  "el paso": { lat: 31.7619, lng: -106.485 },
  "fort hancock": { lat: 31.2998, lng: -105.8433 },
  gateway: { lat: 27.5064, lng: -99.5075 },
  "hidalgo/pharr": { lat: 26.1004, lng: -98.263 },
  "highgate springs": { lat: 44.996, lng: -73.0864 },
  houlton: { lat: 46.1334, lng: -67.8403 },
  "international falls": { lat: 48.6011, lng: -93.4109 },
  jackman: { lat: 45.6039, lng: -70.2525 },
  laredo: { lat: 27.5064, lng: -99.5075 },
  lukeville: { lat: 31.8808, lng: -112.8188 },
  lynden: { lat: 48.9492, lng: -122.4565 },
  madawaska: { lat: 47.3466, lng: -68.3236 },
  "marcelino serna": { lat: 31.4461, lng: -106.2436 },
  massena: { lat: 44.9292, lng: -74.8903 },
  naco: { lat: 31.3376, lng: -109.9487 },
  nogales: { lat: 31.3404, lng: -110.9343 },
  norton: { lat: 44.9995, lng: -71.7956 },
  ogdensburg: { lat: 44.6948, lng: -75.486 },
  "otay mesa": { lat: 32.5618, lng: -116.941 },
  "paso del norte": { lat: 31.7595, lng: -106.4877 },
  pembina: { lat: 48.9668, lng: -97.2397 },
  "port huron": { lat: 42.9711, lng: -82.4443 },
  presidio: { lat: 29.5611, lng: -104.3764 },
  progreso: { lat: 26.0909, lng: -97.9553 },
  "roma texas": { lat: 26.4056, lng: -99.0192 },
  "rio grande city": { lat: 26.3802, lng: -98.8203 },
  roma: { lat: 26.4056, lng: -99.0192 },
  "san luis": { lat: 32.485, lng: -114.7781 },
  "san ysidro": { lat: 32.5422, lng: -117.0295 },
  "santa teresa": { lat: 31.8126, lng: -106.6253 },
  "sault ste. marie": { lat: 46.4953, lng: -84.3453 },
  sumas: { lat: 49.0001, lng: -122.269 },
  sweetgrass: { lat: 48.9992, lng: -111.9586 },
  tecate: { lat: 32.5763, lng: -116.6275 },
  ysleta: { lat: 31.6975, lng: -106.3326 },
};

function haversineMiles(a: GeoPoint, b: GeoPoint): number {
  const R = 3958.8; // Earth radius, miles.
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** A city close enough to count as "nearby" once at least one city has been found. */
const NEARBY_RADIUS_MILES = 40;
/** However many cities are within the radius, a wallet does not open with more than this. */
const MAX_NEARBY_PORTS = 10;

type CityGroup = { border: string; city: string; miles: number; ports: PortWaitTime[] };

export type NearbyBridges = {
  /** Every city within the radius, nearest first. Each is pinned. */
  cities: readonly { border: string; city: string }[];
  /** Every crossing in those cities, grouped by city and capped at `MAX_NEARBY_PORTS`. */
  ports: readonly PortWaitTime[];
};

/**
 * Every published city within `NEARBY_RADIUS_MILES` of `origin`, not just the single
 * closest one — sister crossings a town over (El Paso's Ysleta and Santa Teresa, the
 * Rio Grande Valley's Hidalgo and Progreso) are "nearby" too. The nearest city is kept
 * even past the radius, so a rider far from every border still gets its bridges rather
 * than nothing. Null only when nothing in `ports` has a known location.
 */
export function nearbyBridges(ports: readonly PortWaitTime[], origin: GeoPoint): NearbyBridges | null {
  const byCity = new Map<string, CityGroup>();
  for (const port of ports) {
    const name = portName(port);
    const key = name.city.toLowerCase();
    const point = CITY_LOCATION[key];
    if (!point) continue;
    const entry = byCity.get(key);
    if (entry) entry.ports.push(port);
    else byCity.set(key, { border: port.border, city: name.city, miles: haversineMiles(origin, point), ports: [port] });
  }
  if (byCity.size === 0) return null;

  const cities = [...byCity.values()].sort((a, b) => a.miles - b.miles);
  const cutoff = Math.max(cities[0].miles, NEARBY_RADIUS_MILES);
  const within = cities.filter((group) => group.miles <= cutoff);

  const ports2: PortWaitTime[] = [];
  for (const group of within) {
    for (const port of group.ports) {
      if (ports2.length >= MAX_NEARBY_PORTS) break;
      ports2.push(port);
    }
  }

  return {
    cities: within.map((group) => ({ border: group.border, city: group.city })),
    ports: ports2,
  };
}
