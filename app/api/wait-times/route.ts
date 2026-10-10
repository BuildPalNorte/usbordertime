import {
  BorderWaitTimesError,
  filterPorts,
  getBorderWaitTimes,
  parseWaitTimesQuery,
} from "@/lib/border-wait-times";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const parsed = parseWaitTimesQuery({
    border: request.nextUrl.searchParams.get("border"),
    port: request.nextUrl.searchParams.get("port"),
  });

  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const snapshot = await getBorderWaitTimes();
    const ports = filterPorts(snapshot.ports, parsed.query);

    return Response.json(
      {
        fetchedAt: snapshot.fetchedAt,
        source: snapshot.source,
        count: ports.length,
        ports,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof BorderWaitTimesError
        ? error.message
        : "Could not load border wait times.";

    return Response.json({ error: message }, { status: 502 });
  }
}
