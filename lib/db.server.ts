import { neon } from "@neondatabase/serverless";

/** The one place that reads `DATABASE_URL`. Each call is a cheap HTTP-backed query function. */
export function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Missing DATABASE_URL");
  return neon(url);
}
