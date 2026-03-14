"use client";

// useUnread.ts — single source of truth for message unread state
//
// Responsibilities:
//   • Fetch initial per-thread unread counts from the API on mount
//   • Increment per-thread counts via socket `unread_update` events
//   • Expose total unread count (sum) for the sidebar badge
//   • clearUnread(threadId) — zeros the local count immediately; the
//     caller (ChatThread / InboxList) is responsible for calling
//     markMessagesSeen() on the API side
//   • Guard against double-counting: ignore `unread_update` events
//     for the thread that is currently open (activeThreadId)

import { useEffect, useState, useCallback, useRef } from "react";
import { getSocket } from "../lib/socket";
import api from "../lib/api/api";

interface UnreadUpdatePayload {
    threadId: string;
    count?: number; // backend may send the absolute count; fall back to +1
}

export function useUnread(token: string) {
    // Per-thread unread counts  { threadId → count }
    const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});

    // Which thread is currently open — increments for this thread are suppressed
    const activeThreadRef = useRef<string | null>(null);

    // ── Load initial counts from API ──────────────────────────────────────────
    useEffect(() => {
        if (!token) return;
        api.get("/chat/unread-counts")
            .then(res => {
                // Expected shape: { data: { counts: { [threadId]: number } } }
                const counts: Record<string, number> = res.data?.data?.counts ?? {};
                setUnreadMap(counts);
            })
            .catch(() => {
                // Non-fatal — counts will still increment correctly via socket
            });
    }, [token]);

    // ── Socket: real-time increments ──────────────────────────────────────────
    useEffect(() => {
        if (!token) return;

        const socket = getSocket(token);

        const handleUnreadUpdate = ({ threadId, count }: UnreadUpdatePayload) => {
            // Suppress increment if this thread is currently open
            if (activeThreadRef.current === threadId) return;

            setUnreadMap(prev => ({
                ...prev,
                [threadId]: count !== undefined
                    ? count
                    : (prev[threadId] ?? 0) + 1,
            }));
        };

        socket.on("unread_update", handleUnreadUpdate);
        return () => { socket.off("unread_update", handleUnreadUpdate); };
    }, [token]);

    // ── Total unread (for sidebar badge) ─────────────────────────────────────
    const totalUnread = Object.values(unreadMap).reduce((sum, n) => sum + n, 0);

    // ── Clear a thread's count (call when user opens a thread) ───────────────
    const clearUnread = useCallback((threadId: string) => {
        setUnreadMap(prev => {
            if (!prev[threadId]) return prev;
            return { ...prev, [threadId]: 0 };
        });
    }, []);

    // ── Register the currently-open thread ───────────────────────────────────
    // Pass null when no thread is open
    const setActiveThread = useCallback((threadId: string | null) => {
        activeThreadRef.current = threadId;
        // Also clear immediately when a thread is opened
        if (threadId) clearUnread(threadId);
    }, [clearUnread]);

    return { unreadMap, totalUnread, clearUnread, setActiveThread };
}