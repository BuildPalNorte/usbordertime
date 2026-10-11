import { lookupCameraStream } from "@/lib/camera-stream";
import { fallbackCameraStreams, isCameraAlias } from "@/lib/ports";
import { neon } from "@neondatabase/serverless";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";

const CAMERA_STREAMS_TAG = "camera-streams";

type CameraRow = {
  alias: string;
  src: string;
};

function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Missing DATABASE_URL");
  return neon(url);
}

async function ensureCameraStreamTable() {
  const sql = database();
  await sql`
    create table if not exists camera_stream (
      alias text primary key,
      src text not null,
      updated_at timestamptz not null default now()
    )
  `;
}

function savedPlaylist(src: string): string | null {
  try {
    const url = new URL(src);
    if (url.protocol !== "https:") return null;
    if (url.hostname !== "ipcamlive.com" && !url.hostname.endsWith(".ipcamlive.com")) return null;
    if (!url.pathname.endsWith("/stream.m3u8")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function mergeCameraStreams(rows: CameraRow[]): Record<string, string> {
  const saved = new Map(rows.map((row) => [row.alias, savedPlaylist(row.src)]));
  const streams = fallbackCameraStreams();
  for (const alias of Object.keys(streams)) {
    const src = saved.get(alias);
    if (src) streams[alias] = src;
  }
  return streams;
}

/** Shared playlist addresses. A 404 refresh drops this tag, so the next read is the new row. */
export async function getCameraStreams(): Promise<Record<string, string>> {
  "use cache";
  cacheLife("days");
  cacheTag(CAMERA_STREAMS_TAG);

  await ensureCameraStreamTable();
  const sql = database();
  const rows = (await sql`select alias, src from camera_stream`) as CameraRow[];
  return mergeCameraStreams(rows);
}

/** Looks the alias up, saves the playlist, and expires the shared cache. */
export async function refreshCameraStream(alias: string): Promise<string | null> {
  if (!isCameraAlias(alias)) return null;
  const src = await lookupCameraStream(alias);
  if (!src) return null;

  await ensureCameraStreamTable();
  const sql = database();
  await sql`
    insert into camera_stream (alias, src)
    values (${alias}, ${src})
    on conflict (alias) do update
    set src = excluded.src,
        updated_at = now()
  `;
  revalidateTag(CAMERA_STREAMS_TAG, { expire: 0 });
  return src;
}
