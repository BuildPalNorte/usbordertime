import { refreshCameraStream, getCameraStreams } from "@/lib/camera-streams";
import { fallbackCameraStreams, isCameraAlias } from "@/lib/ports";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    return Response.json(await getCameraStreams(), { headers: NO_STORE });
  } catch {
    return Response.json(fallbackCameraStreams(), { headers: NO_STORE });
  }
}

export async function POST(request: Request) {
  let alias: unknown;
  try {
    const body = (await request.json()) as { alias?: unknown };
    alias = body.alias;
  } catch {
    return Response.json({ error: "Expected a camera alias." }, { status: 400 });
  }

  if (typeof alias !== "string" || !isCameraAlias(alias)) {
    return Response.json({ error: "Unknown camera." }, { status: 404 });
  }

  try {
    const src = await refreshCameraStream(alias);
    if (!src) return Response.json({ error: "Camera lookup failed." }, { status: 502 });
    return Response.json({ alias, src });
  } catch {
    return Response.json({ error: "Camera lookup failed." }, { status: 502 });
  }
}
