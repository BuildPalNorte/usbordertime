import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";

function required(name: "DATABASE_URL" | "BETTER_AUTH_SECRET" | "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET"): string {
  // Static reads, same as the rest of the server. A computed `process.env[name]`
  // is empty in the production bundle, and the build-phase stand-in then pointed
  // Google sign-in at a database host that does not exist.
  const value =
    name === "DATABASE_URL"
      ? process.env.DATABASE_URL
      : name === "BETTER_AUTH_SECRET"
        ? process.env.BETTER_AUTH_SECRET
        : name === "GOOGLE_CLIENT_ID"
          ? process.env.GOOGLE_CLIENT_ID
          : process.env.GOOGLE_CLIENT_SECRET;
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

type Auth = ReturnType<typeof createAuth>;

const globalForAuth = globalThis as unknown as { authPool?: Pool; auth?: Auth };

/** A dev reload must build auth again. The previous client would keep localhost as the only origin. */
if (process.env.NODE_ENV !== "production") globalForAuth.auth = undefined;

function createAuth() {
  const pool =
    globalForAuth.authPool ??
    new Pool({
      connectionString: required("DATABASE_URL"),
      max: 5,
    });

  if (process.env.NODE_ENV !== "production") globalForAuth.authPool = pool;

  return betterAuth({
    secret: required("BETTER_AUTH_SECRET"),
    // The request host is the origin. A fixed BETTER_AUTH_URL of localhost
    // made production reject www.usbordertime.com.
    baseURL: {
      allowedHosts: ["www.usbordertime.com", "usbordertime.com", "localhost:3000", "127.0.0.1:3000"],
      fallback: process.env.NODE_ENV === "production" ? "https://www.usbordertime.com" : "http://localhost:3000",
      protocol: "auto",
    },
    advanced: {
      trustedProxyHeaders: true,
    },
    database: pool,
    socialProviders: {
      google: {
        clientId: required("GOOGLE_CLIENT_ID"),
        clientSecret: required("GOOGLE_CLIENT_SECRET"),
      },
    },
    plugins: [nextCookies()],
  });
}

/** Built on first use so `next build` can collect the auth route without the secrets. */
export function getAuth(): Auth {
  globalForAuth.auth ??= createAuth();
  return globalForAuth.auth;
}
