/**
 * IPCamLive keeps a stable alias per camera. The playlist host and stream id
 * move. A missing playlist is an Apache 404 with no CORS header, so the
 * browser cannot read that status. The server checks it, then asks the alias.
 *
 * The apex host (`ipcamlive.com`) answers that question with an empty 500.
 * The player pages, including the one Comtodo embeds, live on the group hosts.
 */
const LOOKUP_HOSTS = ["g3.ipcamlive.com", "g2.ipcamlive.com", "g1.ipcamlive.com", "g0.ipcamlive.com"];

function playlistFrom(address: unknown, streamid: unknown): string | null {
  if (typeof address !== "string" || typeof streamid !== "string") return null;
  if (!/^[A-Za-z0-9]+$/.test(streamid)) return null;

  let url: URL;
  try {
    url = new URL(address);
  } catch {
    return null;
  }
  if (url.hostname !== "ipcamlive.com" && !url.hostname.endsWith(".ipcamlive.com")) return null;

  url.protocol = "https:";
  url.pathname = `/streams/${streamid}/stream.m3u8`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

async function lookupOnHost(host: string, alias: string): Promise<string | null> {
  let response: Response;
  try {
    response = await fetch(
      `https://${host}/player/getcamerastreamstate.php?alias=${encodeURIComponent(alias)}&getstreaminfo=1`,
      { cache: "no-store" },
    );
  } catch {
    return null;
  }
  if (!response.ok) return null;

  try {
    const body = (await response.json()) as {
      details?: { address?: unknown; streamid?: unknown };
    };
    return playlistFrom(body.details?.address, body.details?.streamid);
  } catch {
    return null;
  }
}

export async function lookupCameraStream(alias: string): Promise<string | null> {
  for (const host of LOOKUP_HOSTS) {
    const src = await lookupOnHost(host, alias);
    if (src) return src;
  }
  return null;
}

/**
 * Asks this app whether `src` is a 404. Only a confirmed 404 comes back as a
 * new playlist. The same address means the failure was something else.
 */
export async function requestCameraStream(alias: string, src: string): Promise<string | null> {
  try {
    const response = await fetch("/api/camera-streams", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ alias, src }),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { src?: unknown };
    return typeof body.src === "string" ? body.src : null;
  } catch {
    return null;
  }
}
