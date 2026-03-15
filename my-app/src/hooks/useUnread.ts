"use client";

// useUnread.ts — single source of truth for per-thread unread counts.
//
// Design notes:
//   • Uses the same getSocket() singleton, so no extra connection is created.
//   • Listens for `unread_update` from the server (increments) AND for
//     `new_message` (so we can suppress the increment when the thread is open).
//   • activeThreadRef is a ref (not state) so the socket handler always reads
//     the latest value without needing to re-subscribe.

import { useEffect, useState, useCallback, useRef } from "react";
import { getSocket } from "../lib/socket";
import api from "../lib/api/api";

interface UnreadUpdatePayload {
    threadId: string;
    count?: number;
}

export function useUnread(token: string) {
    const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
    const activeThreadRef = useRef<string | null>(null);

    // ── Seed initial counts from API ─────────────────────────────────────────
    useEffect(() => {
        if (!token) return;
        api.get("/chat/unread-counts")
            .then(res => {
                const counts: Record<string, number> = res.data?.data?.counts ?? {};
                setUnreadMap(counts);
            })
            .catch(() => { /* non-fatal */ });
    }, [token]);

    // ── Real-time socket listener ─────────────────────────────────────────────
    useEffect(() => {
        if (!token) return;

        // Reuse the singleton — does NOT create a new connection
        const socket = getSocket(token);

        const handleUnreadUpdate = ({ threadId, count }: UnreadUpdatePayload) => {
            // If the user is currently in this thread, server already cleared the
            // Redis key; just keep our local count at 0
            if (activeThreadRef.current === threadId) return;

            setUnreadMap(prev => ({
                ...prev,
                [threadId]: count !== undefined ? count : (prev[threadId] ?? 0) + 1,
            }));
        };

        socket.on("unread_update", handleUnreadUpdate);
        return () => { socket.off("unread_update", handleUnreadUpdate); };
    }, [token]);

    // ── Derived totals ────────────────────────────────────────────────────────
    const totalUnread = Object.values(unreadMap).reduce((sum, n) => sum + n, 0);

    // ── Imperative helpers ────────────────────────────────────────────────────
    const clearUnread = useCallback((threadId: string) => {
        setUnreadMap(prev => {
            if (!prev[threadId]) return prev;
            return { ...prev, [threadId]: 0 };
        });
    }, []);

    const setActiveThread = useCallback((threadId: string | null) => {
        activeThreadRef.current = threadId;
        if (threadId) clearUnread(threadId);
    }, [clearUnread]);

    // Allows InboxList to patch the map when a thread_update arrives via socket
    const patchThread = useCallback((threadId: string, delta: number) => {
        if (activeThreadRef.current === threadId) return;
        setUnreadMap(prev => ({
            ...prev,
            [threadId]: Math.max(0, (prev[threadId] ?? 0) + delta),
        }));
    }, []);

    return { unreadMap, totalUnread, clearUnread, setActiveThread, patchThread };
}