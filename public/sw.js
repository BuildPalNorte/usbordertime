/* Border Time service worker. It shows a wait alert and, when this site is on screen,
   asks the page to show the same alert. It does not cache pages or intercept requests. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = null;
  try {
    data = event.data ? event.data.json() : null;
  } catch {
    data = null;
  }
  if (!data || typeof data.title !== "string") return;

  const title = data.title;
  const body = typeof data.body === "string" ? data.body : "";
  const url = typeof data.url === "string" ? data.url : "/";

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // macOS does not banner a notification from the app you're looking at. The open page shows it.
      for (const client of windows) {
        if (client.visibilityState !== "visible") continue;
        client.postMessage({ type: "wait-alert", title, body, url });
      }
      // No requireInteraction: on a Mac that option skips the banner and only fills Notification Center.
      await self.registration.showNotification(title, {
        body,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: typeof data.tag === "string" ? data.tag : undefined,
        renotify: true,
        data: { url },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw = event.notification.data && event.notification.data.url;
  // Same origin only, whatever the payload says.
  const target = new URL(typeof raw === "string" ? raw : "/", self.location.origin);
  if (target.origin !== self.location.origin) return;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        await client.focus();
        if ("navigate" in client) await client.navigate(target.href);
        return;
      }
      await self.clients.openWindow(target.href);
    })(),
  );
});
