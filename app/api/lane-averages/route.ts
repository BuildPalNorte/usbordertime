import { BorderWaitTimesError } from "@/lib/border-wait-times";
import { getLaneAverages } from "@/lib/get-lane-averages";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const port = request.nextUrl.searchParams.get("port")?.trim() ?? "";
  if (!/^\d{6}$/.test(port)) {
    return Response.json({ error: "port must be a 6-digit port number." }, { status: 400 });
  }

  try {
    const averages = await getLaneAverages(port);
    if (!averages) {
      return Response.json({ error: "No average is published for that crossing." }, { status: 404 });
    }

    return Response.json(averages, {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    const message =
      error instanceof BorderWaitTimesError
        ? error.message
        : "Could not load lane averages.";

    return Response.json({ error: message }, { status: 502 });
  }
}
