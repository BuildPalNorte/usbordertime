import { ASK_RULES, BORDER_KNOWLEDGE } from "@/lib/ask-knowledge";
import type { BorderWaitTimes, PortWaitTime } from "@/lib/border-wait-times";
import { getBorderWaitTimes } from "@/lib/border-wait-times";
import { getLaneAverages } from "@/lib/get-lane-averages";
import { averageForHour } from "@/lib/lane-averages";
import type { Locale } from "@/lib/i18n";
import { MODE_IDS, isMode, portName, readLane, type Mode } from "@/lib/ports";

/** Cheap chat model. The tool loop is small, so cost per question stays a fraction of a cent. */
export const ASK_MODEL = "gpt-4o-mini";

export const MAX_TURNS = 12;
export const MAX_MESSAGE_CHARS = 1000;
const MAX_TOOL_ROUNDS = 3;

export type AskMessage = { role: "user" | "assistant"; content: string };

export function parseMessages(value: unknown): AskMessage[] | null {
  if (!Array.isArray(value)) return null;
  const messages: AskMessage[] = [];
  for (const item of value.slice(-MAX_TURNS)) {
    if (!item || typeof item !== "object") return null;
    const { role, content } = item as { role?: unknown; content?: unknown };
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    const text = content.trim().slice(0, MAX_MESSAGE_CHARS);
    if (text) messages.push({ role, content: text });
  }
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") return null;
  return messages;
}

/* ----------------------------- live data ----------------------------- */

function laneLine(port: PortWaitTime, mode: Mode): string | null {
  const reading = readLane(port, mode);
  if (!reading.available) return null;
  if (reading.minutes !== null) {
    const lanes = reading.lanesOpen !== null ? ` (${reading.lanesOpen} open)` : "";
    return `${mode} ${reading.minutes}min${lanes}`;
  }
  return `${mode} ${reading.statusKey === "pending" ? "no data" : "closed"}`;
}

function portLine(port: PortWaitTime): string {
  const name = portName(port);
  const lanes = MODE_IDS.flatMap((mode) => laneLine(port, mode) ?? []).join(", ");
  const border = port.border.toLowerCase().includes("canad") ? "Canada" : "Mexico";
  const notice = port.constructionNotice ? ` | notice: ${port.constructionNotice.slice(0, 160)}` : "";
  return `#${port.portNumber} ${name.title} (${name.city}, ${border}) | ${port.portStatus || "status unknown"} | hours ${port.hours || "n/a"} | ${lanes || "no lanes published"}${notice}`;
}

export function liveData(snapshot: BorderWaitTimes): string {
  const first = snapshot.ports.find((port) => port.time) ?? snapshot.ports[0];
  const now = first ? `${first.date} ${first.time}` : "unknown";
  // Mexico first: that is most of this app's riders, and it keeps the long list ordered.
  const ports = [...snapshot.ports].sort((a, b) => {
    const am = a.border.toLowerCase().includes("mexic") ? 0 : 1;
    const bm = b.border.toLowerCase().includes("mexic") ? 0 : 1;
    return am - bm || a.portName.localeCompare(b.portName, "en-US");
  });
  return [
    `Local time at the ports when CBP last published: ${now}. Snapshot fetched at ${snapshot.fetchedAt}. Waits are northbound, entering the U.S.`,
    ...ports.map(portLine),
  ].join("\n");
}

function systemPrompt(locale: Locale, snapshot: BorderWaitTimes | null): string {
  const data = snapshot
    ? liveData(snapshot)
    : "The live feed is unavailable right now. Say you cannot see current waits, and answer only from general knowledge.";
  return `${ASK_RULES}\n\nApp locale: ${locale === "es" ? "Spanish" : "English"}.\n\nLIVE DATA (one line per port):\n${data}\n\nREFERENCE:\n${BORDER_KNOWLEDGE}`;
}

/* ----------------------------- tools ----------------------------- */

const TOOLS = [
  {
    type: "function",
    function: {
      name: "usual_waits",
      description:
        "Typical wait in minutes for each hour of the day (0 to 23, local time at the port) for one lane at one port, from CBP's hourly averages. Use it for trips that start later or for the best time to cross.",
      parameters: {
        type: "object",
        properties: {
          port_number: { type: "string", description: "The CBP port number, such as 535501." },
          lane: { type: "string", enum: [...MODE_IDS] },
        },
        required: ["port_number", "lane"],
        additionalProperties: false,
      },
    },
  },
] as const;

async function runTool(name: string, rawArgs: string): Promise<string> {
  if (name !== "usual_waits") return JSON.stringify({ error: "Unknown tool." });
  let args: { port_number?: unknown; lane?: unknown };
  try {
    args = JSON.parse(rawArgs) as typeof args;
  } catch {
    return JSON.stringify({ error: "Bad arguments." });
  }
  const portNumber = typeof args.port_number === "string" ? args.port_number.trim() : "";
  const lane = args.lane;
  if (!/^[A-Za-z0-9]{4,10}$/.test(portNumber) || !isMode(lane)) {
    return JSON.stringify({ error: "Unknown port or lane." });
  }
  try {
    const averages = await getLaneAverages(portNumber);
    if (!averages) return JSON.stringify({ error: "No hourly averages for this port." });
    const hours: Record<string, number | null> = {};
    for (let hour = 0; hour < 24; hour += 1) {
      hours[String(hour)] = averageForHour(averages.hours[lane], hour);
    }
    return JSON.stringify({ port_number: portNumber, lane, unit: "minutes", hours });
  } catch {
    return JSON.stringify({ error: "Hourly averages are unavailable right now." });
  }
}

/* ----------------------------- model ----------------------------- */

type ToolCall = { id: string; function: { name: string; arguments: string } };
type ChatMessage =
  | { role: "system" | "user" | "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export class AskError extends Error {}

async function complete(messages: ChatMessage[], withTools: boolean) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: ASK_MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 500,
      ...(withTools ? { tools: TOOLS } : {}),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new AskError(`OpenAI returned ${response.status}.`);
  const body = (await response.json()) as {
    choices?: { message?: { content?: string | null; tool_calls?: ToolCall[] } }[];
  };
  const message = body.choices?.[0]?.message;
  if (!message) throw new AskError("OpenAI returned no message.");
  return message;
}

export async function answer(history: AskMessage[], locale: Locale): Promise<string> {
  if (!process.env.OPENAI_API_KEY) throw new AskError("OPENAI_API_KEY is not set.");

  let snapshot: BorderWaitTimes | null = null;
  try {
    snapshot = await getBorderWaitTimes();
  } catch {
    snapshot = null;
  }

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt(locale, snapshot) },
    ...history,
  ];

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
    const last = round === MAX_TOOL_ROUNDS;
    const message = await complete(messages, !last);
    const calls = message.tool_calls ?? [];
    if (calls.length === 0 || last) {
      const text = message.content?.trim();
      if (!text) throw new AskError("OpenAI returned an empty answer.");
      return text;
    }
    messages.push({ role: "assistant", content: message.content ?? null, tool_calls: calls });
    const results = await Promise.all(
      calls.slice(0, 4).map(async (call) => ({
        role: "tool" as const,
        tool_call_id: call.id,
        content: await runTool(call.function.name, call.function.arguments),
      })),
    );
    // Every tool call needs a reply, even the ones past the cap.
    for (const call of calls.slice(4)) {
      results.push({ role: "tool", tool_call_id: call.id, content: '{"error":"Too many calls."}' });
    }
    messages.push(...results);
  }
  throw new AskError("No answer.");
}

/* ----------------------------- rate limit ----------------------------- */

const WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

/** Best effort, per server instance. Stops a stuck loop from running up the bill. */
export function allow(userId: string, limit: number): boolean {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= limit) {
    hits.set(userId, recent);
    return false;
  }
  recent.push(now);
  hits.set(userId, recent);
  if (hits.size > 2000) {
    for (const [key, times] of hits) {
      if (times.every((time) => now - time >= WINDOW_MS)) hits.delete(key);
    }
  }
  return true;
}
