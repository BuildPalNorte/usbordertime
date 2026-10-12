import { fallbackFeedAddresses } from "@/lib/camera-feeds";
import { getCameraFeeds, isFeedId, refreshCameraFeed } from "@/lib/camera-feeds.server";

/** Mirrors `/api/camera-streams`, for the cameras in `lib/camera-feeds.ts`. */
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    return Response.json(await getCameraFeeds(), { headers: NO_STORE });
  } catch (error) {
    console.error("camera feeds", error);
    return Response.json(fallbackFeedAddresses(), { headers: NO_STORE });
  }
}

export async function POST(request: Request) {

  let id: unknown;
  let current: string | undefined;
  try {
    const body = (await request.json()) as { id?: unknown; src?: unknown };
    id = body.id;
    if (typeof body.src === "string") current = body.src;
  } catch {
    return Response.json({ error: "Expected a camera id." }, { status: 400 });
  }

  if (typeof id !== "string" || !isFeedId(id)) {
    return Response.json({ error: "Unknown camera." }, { status: 404 });
  }

  try {
    const src = await refreshCameraFeed(id, current);
    if (!src) return Response.json({ error: "Camera lookup failed." }, { status: 502 });
    return Response.json({ id, src });
  } catch (error) {
    console.error("camera feed lookup", error);
    return Response.json({ error: "Camera lookup failed." }, { status: 502 });
  }
}
