"use client";

import { dropCampaignParam, rememberCampaign } from "@/lib/campaign";
import { detectInAppBrowser } from "@/lib/in-app-browser";
import { dropInviteParam, rememberInvite } from "@/lib/invite";
import { holdForVisitor } from "@/lib/visitor-ready";
import { useEffect, useLayoutEffect } from "react";

/** Set after the first note this page load, so a strict-mode remount does not note twice. */
let noted = false;

/**
 * Mounted for a visit with no session. It keeps what the sign-in screen used to keep: the sharer
 * and the campaign from the link, so an account made later still gets them, and one note per page
 * load that this browser came, so arrivals are still counted.
 */
export function GuestEntry() {
  useLayoutEffect(() => {
    rememberInvite(window.location.search);
    rememberCampaign(window.location.search);
    dropInviteParam();
    // An in-app browser's cookie does not follow them into Safari. Leave `c` on the
    // address so Copy link and Open in browser still carry the campaign.
    if (!detectInAppBrowser(navigator.userAgent)) dropCampaignParam();
  }, []);

  useEffect(() => {
    if (noted) return;
    noted = true;
    holdForVisitor(fetch("/api/visitor", { method: "POST", keepalive: true }));
  }, []);

  return null;
}
