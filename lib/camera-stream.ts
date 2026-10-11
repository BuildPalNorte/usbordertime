/**
 * IPCamLive keeps a stable alias per camera. The playlist host and stream id
 * move. A missing playlist is an Apache 404 with no CORS header, so the
 * browser cannot read that status. The server checks it, then asks the alias.
 */

export async function lookupCameraStream(alias: string): Promise<string | null> {
  let response: Response;
  try {
    response = await fetch(
      `https://ipcamlive.com/player/getcamerastreamstate.php?alias=${encodeURIComponent(alias)}&getstreaminfo=1`,
      { cache: "no-store" },
    );
  } catch {
    return null;
  }
  if (!response.ok) return null;

  let address: unknown;
  let streamid: unknown;
  try {
    const body = (await response.json()) as {
      details?: { address?: unknown; streamid?: unknown };
    };
    address = body.details?.address;
    streamid = body.details?.streamid;
  } catch {
    return null;
  }
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
