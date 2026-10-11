import { getAuth } from "@/lib/auth/server";
import { toNextJsHandler } from "better-auth/next-js";
import { connection } from "next/server";

async function handle(request: Request) {
  // Stop the production prerender before auth is built. Otherwise the build
  // constructs Better Auth without the runtime secrets and every sign-in 500s.
  await connection();
  const handlers = toNextJsHandler(getAuth());
  return request.method === "POST" ? handlers.POST(request) : handlers.GET(request);
}

export function GET(request: Request) {
  return handle(request);
}

export function POST(request: Request) {
  return handle(request);
}
