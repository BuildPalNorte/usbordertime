/** Client-safe. No server imports here. */

/**
 * Tells the server this crossing's details were opened. Best effort: a failure is ignored and
 * nothing waits on it. The server drops a repeat from the same account within seconds.
 */
export function trackPortView(portNumber: string): void {
  void fetch("/api/views", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ portNumber }),
    keepalive: true,
  }).catch(() => {});
}
