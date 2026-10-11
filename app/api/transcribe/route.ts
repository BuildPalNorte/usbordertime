import { allow, TRANSCRIBE_MODEL } from "@/lib/ask.server";
import {
  badRequest,
  NO_STORE,
  serverError,
  sessionUserId,
  unauthorized,
} from "@/lib/session.server";

const MAX_BYTES = 4 * 1024 * 1024;

/** Helps the transcriber with words a border rider says. */
const HINT =
  "Border crossing question in English or Spanish. Words: puente, Nuevo, Viejo, Gateway, B&M, Veterans, De los tomates, Los Indios, Brownsville, Matamoros, Hidalgo, Pharr, Laredo, SENTRI, NEXUS, Ready Lane, aduana, garita, CBP, FMM, pasaporte.";

/** Audio in, text out. A transcription model, not a voice model; the answer still comes from /api/ask. */
export async function POST(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return unauthorized();
  if (!process.env.OPENAI_API_KEY) return serverError("Voice is not set up.");

  let audio: FormDataEntryValue | null;
  try {
    audio = (await request.formData()).get("audio");
  } catch {
    return badRequest("Expected audio.");
  }
  if (!(audio instanceof File) || audio.size === 0) return badRequest("Expected audio.");
  if (audio.size > MAX_BYTES) return badRequest("That recording is too long.");
  if (!audio.type.startsWith("audio/") && !audio.type.startsWith("video/")) {
    return badRequest("Expected audio.");
  }

  if (!allow(`t:${userId}`, 12)) {
    return Response.json(
      { error: "Too many recordings. Wait a minute." },
      { status: 429, headers: NO_STORE },
    );
  }

  const form = new FormData();
  form.set("file", audio, audio.name || "voice.webm");
  form.set("model", TRANSCRIBE_MODEL);
  form.set("prompt", HINT);
  form.set("response_format", "json");

  try {
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) return serverError("Could not transcribe that.");
    const body = (await response.json()) as { text?: unknown };
    const text = typeof body.text === "string" ? body.text.trim() : "";
    return Response.json({ text }, { headers: NO_STORE });
  } catch {
    return serverError("Could not transcribe that.");
  }
}
