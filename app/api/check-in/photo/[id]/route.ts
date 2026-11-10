import { readCheckInPhoto } from "@/lib/check-in.server";

/** One check-in photo. The id is a random uuid; the picture is only served while the check-in is live. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id.length > 64) return new Response("Not found", { status: 404 });

  try {
    const photo = await readCheckInPhoto(id);
    if (!photo) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(photo), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(photo.length),
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("check-in photo", error);
    return new Response("Could not load the photo.", { status: 500 });
  }
}
