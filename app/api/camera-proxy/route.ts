import { PROXY_HOSTS } from "@/lib/camera-feeds";

/**
 * Fetches one camera address on behalf of the browser, because some sources only allow their own
 * origin (CORS) or check the referrer. Only hosts in `PROXY_HOSTS` are served and redirects are not
 * followed. Safari plays HLS natively and skips this; other browsers send every segment through it.
 * HLS playlists are rewritten so every segment comes back through here too.
 */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function proxied(target: string): string {
  return `/api/camera-proxy?u=${encodeURIComponent(target)}`;
}

function rewritePlaylist(text: string, base: URL): string {
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith("#")) {
        return line.replace(/URI="([^"]+)"/g, (_, uri: string) => {
          return `URI="${proxied(new URL(uri, base).toString())}"`;
        });
      }
      return proxied(new URL(trimmed, base).toString());
    })
    .join("\n");
}

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("u");
  let target: URL;
  try {
    target = new URL(raw ?? "");
  } catch {
    return new Response("Bad address", { status: 400 });
  }
  const referer = PROXY_HOSTS[target.hostname];
  if (!referer || (target.protocol !== "https:" && target.protocol !== "http:")) {
    return new Response("Host not allowed", { status: 403 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      headers: { "user-agent": UA, referer },
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return new Response("Camera did not answer", { status: 504 });
  }
  if (!upstream.ok) {
    return new Response("Camera returned an error", { status: upstream.status === 404 ? 404 : 502 });
  }

  const type = upstream.headers.get("content-type") ?? "application/octet-stream";
  const headers = { "cache-control": "no-store" };

  if (target.pathname.endsWith(".m3u8") || type.includes("mpegurl")) {
    const body = rewritePlaylist(await upstream.text(), target);
    return new Response(body, {
      headers: { ...headers, "content-type": "application/vnd.apple.mpegurl" },
    });
  }
  return new Response(upstream.body, { headers: { ...headers, "content-type": type } });
}
