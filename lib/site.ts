/** Absolute site origin for the sitemap and robots, which have no request to read a host from. */
export function siteOrigin(): string {
  if (process.env.NODE_ENV === "production") return "https://www.usbordertime.com";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
