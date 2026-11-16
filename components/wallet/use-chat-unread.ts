"use client";

import { chatSeenStore } from "@/lib/chat-seen-store";
import { chatClosed, type Unread } from "@/lib/check-in";
import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";

type UnreadMap = Record<string, Unread>;
const KEY = ["chat-unread"] as const;

/** One lookup a minute for the saved bridges: a few bytes back, no message text. */
const REFRESH_MS = 60_000;

/**
 * Keeps the unread counts for `ports` fresh. Mounted once, by the wallet. Nothing is fetched
 * overnight (the chat is shut), while the tab is hidden, or with no bridges saved.
 */
export function useChatUnreadSync(ports: string[]): void {
  const queryClient = useQueryClient();
  const watched = [...new Set(ports)].sort().join(",");

  useQuery<UnreadMap>({
    queryKey: KEY,
    enabled: watched !== "",
    refetchInterval: REFRESH_MS,
    queryFn: async ({ signal }) => {
      if (chatClosed()) return {};
      const watch = watched
        .split(",")
        .map((port) => `${port}:${chatSeenStore.since(port)}`)
        .join(",");
      const response = await fetch(`/api/check-in/unread?watch=${encodeURIComponent(watch)}`, { signal });
      if (!response.ok) throw new Error("unread");
      return ((await response.json()) as { unread: UnreadMap }).unread;
    },
  });

  // Saving or removing a bridge changes who is watched, so look again.
  useEffect(() => {
    if (watched) void queryClient.invalidateQueries({ queryKey: KEY });
  }, [watched, queryClient]);
}

/** What is new at one bridge. Reads the shared counts; it never fetches. */
export function useChatUnread(portNumber: string): Unread | null {
  const { data } = useQuery<UnreadMap>({ queryKey: KEY, queryFn: skipToken });
  const found = data?.[portNumber];
  return found && found.messages > 0 ? found : null;
}

/** Everything new across all saved bridges, for the profile button. Reads the shared counts. */
export function useChatUnreadTotal(): (Unread & { port: string }) | null {
  const { data } = useQuery<UnreadMap>({ queryKey: KEY, queryFn: skipToken });
  let messages = 0;
  let replies = 0;
  let port = "";
  let best: Unread | null = null;
  for (const [key, entry] of Object.entries(data ?? {})) {
    messages += entry.messages;
    replies += entry.replies;
    // The bridge to open: one that answered the rider first, otherwise the busiest.
    if (!best || entry.replies > best.replies || (entry.replies === best.replies && entry.messages > best.messages)) {
      best = entry;
      port = key;
    }
  }
  return messages > 0 ? { messages, replies, port } : null;
}

/** Called while a chat is open: everything up to `at` is seen, so its badge clears at once. */
export function useMarkChatSeen(portNumber: string): (at: number) => void {
  const queryClient = useQueryClient();
  return useCallback(
    (at: number) => {
      chatSeenStore.markSeen(portNumber, at);
      queryClient.setQueryData<UnreadMap>(KEY, (current) => {
        if (!current?.[portNumber]) return current;
        const rest = { ...current };
        delete rest[portNumber];
        return rest;
      });
    },
    [portNumber, queryClient],
  );
}
