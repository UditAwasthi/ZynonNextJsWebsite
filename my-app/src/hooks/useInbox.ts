"use client";

// useInbox.ts — owns inbox thread list + all real-time mutations.
//
// Extracted from InboxList so it can be shared with the parent page,
// preventing a second getInbox() fetch when the ForwardModal opens.

import { useEffect, useState, useCallback, useRef } from "react";
import { getSocket } from "../lib/socket";
import { getInbox } from "../lib/api/chatApi";
import type { Thread } from "../components/messaging/InboxList";

// ── Profile picture fetcher ───────────────────────────────────────────────────
// Module-level cache + in-flight dedup so multiple inbox instances and
// ChatThread all share the same results — matches the pattern in page.tsx.
const _picCache    = new Map<string, string | null>();
const _picInflight = new Map<string, Promise<string | null>>();

export async function fetchProfilePic(username: string): Promise<string | null> {
    if (_picCache.has(username)) return _picCache.get(username)!;
    if (_picInflight.has(username)) return _picInflight.get(username)!;

    const base = process.env.NEXT_PUBLIC_API_BASE ?? "https://zynon.onrender.com/api/";
    let token: string | null = null;
    try { token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null; } catch {}
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    const promise = fetch(`${base}profile/${username}`, { headers })
        .then(r => r.ok ? r.json() : null)
        .then(json => {
            // API returns either data.profile.profilePicture or data.profilePicture
            const pic: string | null =
                json?.data?.profile?.profilePicture ??
                json?.data?.profilePicture ??
                null;
            _picCache.set(username, pic);
            _picInflight.delete(username);
            return pic;
        })
        .catch(() => {
            _picCache.set(username, null);
            _picInflight.delete(username);
            return null;
        });

    _picInflight.set(username, promise);
    return promise;
}

export async function enrichThreadsWithProfilePics(threads: Thread[]): Promise<Thread[]> {
    // Only fetch for DM threads whose user doesn't already have a pic
    const toFetch = threads.filter(
        t => t.type === "dm" && t.user && !_picCache.has(t.user.username)
    );

    await Promise.allSettled(toFetch.map(t => fetchProfilePic(t.user!.username)));

    return threads.map(t => {
        if (t.type !== "dm" || !t.user) return t;
        const pic = _picCache.get(t.user.username);
        if (!pic || t.user.profilePicture === pic) return t;
        return { ...t, user: { ...t.user, profilePicture: pic } };
    });
}

interface InboxMessage {
    messageId?: string;
    senderId?: string;
    content?: string;
    mediaType?: string;
    createdAt?: string;
}

export function useInbox(token: string, currentUserId: string) {
    const [threads, setThreads] = useState<Thread[]>([]);
    const [loading, setLoading] = useState(true);

    // ── Initial fetch ─────────────────────────────────────────────────────────
    const fetchInbox = useCallback(async () => {
        try {
            const res = await getInbox();
            const data: Thread[] = res.data?.data ?? [];
            // Enrich with profile pictures — resolves from cache instantly for
            // known users, fires network requests for new ones
            const enriched = await enrichThreadsWithProfilePics(data);
            setThreads(enriched);
        } catch {
            // non-fatal
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchInbox(); }, [fetchInbox]);

    // ── Socket listeners ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!token) return;
        const socket = getSocket(token);

        // New DM created by another user, or we were added to a group
        const onThreadCreated = (thread: Thread) => {
            setThreads(prev => {
                // Avoid duplicates if we created it ourselves
                if (prev.some(t => t.threadId === thread.threadId)) return prev;
                return [thread, ...prev];
            });
        };

        // Any message sent in a thread we're part of — update lastMessage preview
        const onThreadUpdate = ({ threadId, lastMessage }: {
            threadId: string;
            lastMessage: InboxMessage;
        }) => {
            setThreads(prev =>
                prev.map(t =>
                    t.threadId === threadId
                        ? { ...t, lastMessage, lastActivity: lastMessage.createdAt ?? t.lastActivity }
                        : t
                ).sort((a, b) =>
                    new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
                )
            );
        };

        // We were removed from a group
        const onRemovedFromGroup = ({ threadId }: { threadId: string }) => {
            setThreads(prev => prev.filter(t => t.threadId !== threadId));
        };

        // A new member was added — refresh that thread's participant count if needed
        // (for now just a no-op; we don't show participant counts in the inbox)
        const onMemberAdded = (_payload: unknown) => { /* could refresh thread */ };

        socket.on("thread_created",    onThreadCreated);
        socket.on("thread_update",     onThreadUpdate);
        socket.on("removed_from_group", onRemovedFromGroup);
        socket.on("member_added",      onMemberAdded);

        return () => {
            socket.off("thread_created",    onThreadCreated);
            socket.off("thread_update",     onThreadUpdate);
            socket.off("removed_from_group", onRemovedFromGroup);
            socket.off("member_added",      onMemberAdded);
        };
    }, [token]);

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Prepend a newly-created thread (called after createGroupThread) */
    const prependThread = useCallback((thread: Thread) => {
        setThreads(prev => {
            if (prev.some(t => t.threadId === thread.threadId)) return prev;
            return [thread, ...prev];
        });
    }, []);

    return { threads, loading, fetchInbox, prependThread };
}