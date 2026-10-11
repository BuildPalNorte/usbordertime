/** How a new account said they found Border Time. Stored on `profile.referral`. */
export const REFERRALS = [
  "friend",
  "whatsapp",
  "instagram",
  "tiktok",
  "facebook",
  "google",
  "other",
] as const;

export type Referral = (typeof REFERRALS)[number];

/** English labels. Spanish lives in `COPY`. */
export const REFERRAL_LABEL: Record<Referral, string> = {
  friend: "A friend or family",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  google: "Google",
  other: "Somewhere else",
};

export function isReferral(value: unknown): value is Referral {
  return typeof value === "string" && (REFERRALS as readonly string[]).includes(value);
}
