import { getSnapshot } from "@/lib/camera-snapshot.server";

/**
 * The shared copy of one snapshot. The page puts the picture's hash in
 * the query, so the browser may keep it until the picture changes. Off in production.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const snapshot = await getSnapshot(id);
  if (!snapshot) return new Response("Unknown camera", { status: 404 });
  if (!snapshot.bytes) return new Response("No picture yet", { status: 502 });

  return new Response(Buffer.from(snapshot.bytes), {
    headers: {
      "content-type": snapshot.type,
      "cache-control": "private, max-age=300",
    },
  });
}
