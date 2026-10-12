import { getSnapshot } from "@/lib/camera-snapshot.server";

/** Health of one snapshot camera. Off in production. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const snapshot = await getSnapshot(id);
  if (!snapshot) return new Response("Unknown camera", { status: 404 });

  return Response.json(snapshot.health, { headers: { "cache-control": "no-store" } });
}
