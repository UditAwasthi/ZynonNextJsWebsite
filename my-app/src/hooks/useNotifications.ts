"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import api from "../lib/api/api";
import { getSocket } from "../lib/socket";
import { cache } from "../lib/cache";
import type { Notification } from "../components/notifications/types";

const CACHE_KEY = "notifications:list";
const COUNT_KEY = "notifications:unread-count";
const LIMIT = 20;

// NEW_MESSAGE shown on Messages icon only — never in the notification panel
const EXCLUDED_TYPES: Notification["type"][] = ["NEW_MESSAGE"];

const profilePicCache = new Map<string, string | null>();

async function enrichWithProfilePictures(notifications: Notification[]): Promise<Notification[]> {
    const usernamesToFetch = [
        ...new Set(
            notifications
                .filter(n => n.actor?.username && !n.actor.profilePicture)
                .map(n => n.actor.username)
                .filter(username => !profilePicCache.has(username))
        )
    ];

    if (usernamesToFetch.length > 0) {
        await Promise.allSettled(
            usernamesToFetch.map(async (username) => {
                try {
                    const { data } = await api.get(`/profile/${username}`);
                    const pic =
                        data?.data?.profilePicture ??
                        data?.data?.profile?.profilePicture ??
                        data?.profilePicture ??
                        null;
                    profilePicCache.set(username, pic);
                } catch {
                    profilePicCache.set(username, null);
                }
            })
        );
    }

    return notifications.map(n => {
        if (!n.actor?.username) return n;
        const pic = n.actor.profilePicture ?? profilePicCache.get(n.actor.username) ?? null;
        return pic ? { ...n, actor: { ...n.actor, profilePicture: pic } } : n;
    });
}

export function useNotifications(panelOpen: boolean) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const fetchedRef = useRef(false);

    // ── Token guard: don't fire any request without a valid token ──────────────
    const hasToken = useCallback((): boolean => {
        if (typeof window === "undefined") return false;
        return !!localStorage.getItem("accessToken");
    }, []);

    const fetchUnreadCount = useCallback(async () => {
        // Don't attempt if there's no token — avoids 401 → refresh → reload loop
        if (!hasToken()) return;

        const cached = cache.get<number>(COUNT_KEY);
        if (cached !== null) { setUnreadCount(cached); return; }
        try {
            const { data } = await api.get("/notifications/unread-count");
            const count = data.data.unread ?? 0;
            setUnreadCount(count);
            cache.set(COUNT_KEY, count, 60_000);
        } catch { /* silent */ }
    }, [hasToken]);

    const fetchNotifications = useCallback(async () => {
        if (fetchedRef.current) return;
        // Don't attempt if there's no token
        if (!hasToken()) return;

        fetchedRef.current = true;

        const stale = cache.getStale<Notification[]>(CACHE_KEY);
        if (stale?.length) setNotifications(stale.filter(n => !EXCLUDED_TYPES.includes(n.type)));

        setLoading(true);
        setError(null);
        try {
            const { data } = await api.get("/notifications", { params: { limit: LIMIT } });
            const list: Notification[] = data.data.notifications ?? [];
            const cursor: string | null = data.data.nextCursor;

            const filtered = list.filter(n => !EXCLUDED_TYPES.includes(n.type));
            const enriched = await enrichWithProfilePictures(filtered);

            setNotifications(enriched);
            setNextCursor(cursor);
            setHasMore(!!cursor && list.length === LIMIT);
            cache.set(CACHE_KEY, enriched, 2 * 60_000);

            const unread = enriched.filter(n => !n.read).length;
            setUnreadCount(unread);
            cache.set(COUNT_KEY, unread, 60_000);
        } catch {
            setError("Failed to load notifications.");
            fetchedRef.current = false;
        } finally {
            setLoading(false);
        }
    }, [hasToken]);

    const refresh = useCallback(async () => {
        fetchedRef.current = false;
        setNextCursor(null);
        setHasMore(true);
        await fetchNotifications();
    }, [fetchNotifications]);

    const loadMore = useCallback(async () => {
        if (!nextCursor || loadingMore || !hasMore) return;
        if (!hasToken()) return;

        setLoadingMore(true);
        try {
            const { data } = await api.get("/notifications", {
                params: { limit: LIMIT, cursor: nextCursor },
            });
            const more: Notification[] = data.data.notifications ?? [];
            const cursor: string | null = data.data.nextCursor;

            const filtered = more.filter(n => !EXCLUDED_TYPES.includes(n.type));
            const enriched = await enrichWithProfilePictures(filtered);

            setNotifications(prev => {
                const existingIds = new Set(prev.map(n => n._id));
                return [...prev, ...enriched.filter(n => !existingIds.has(n._id))];
            });
            setNextCursor(cursor);
            setHasMore(!!cursor && more.length === LIMIT);
        } catch { /* silent */ } finally {
            setLoadingMore(false);
        }
    }, [nextCursor, loadingMore, hasMore, hasToken]);

    const markRead = useCallback(async (ids: string[]) => {
        const prevNotifs = notifications;
        const prevCount = unreadCount;
        const actualUnread = ids.filter(
            id => notifications.find(n => n._id === id && !n.read)
        ).length;

        setNotifications(prev => prev.map(n => ids.includes(n._id) ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - actualUnread));
        cache.invalidate(COUNT_KEY);

        try {
            await api.patch("/notifications/read", { ids });
        } catch {
            setNotifications(prevNotifs);
            setUnreadCount(prevCount);
        }
    }, [notifications, unreadCount]);

    const markAllRead = useCallback(async () => {
        const prevNotifs = notifications;
        const prevCount = unreadCount;

        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
        cache.invalidate(COUNT_KEY);

        try {
            await api.patch("/notifications/read-all");
        } catch {
            setNotifications(prevNotifs);
            setUnreadCount(prevCount);
        }
    }, [notifications, unreadCount]);

    // Socket: real-time push — only connect if token exists
    useEffect(() => {
        if (!hasToken()) return;

        const token = localStorage.getItem("accessToken")!;
        let socket: ReturnType<typeof getSocket>;
        try { socket = getSocket(token); } catch { return; }

        const handler = async (newNotif: Notification) => {
            if (!newNotif.actor || typeof newNotif.actor === "string") return;
            if (EXCLUDED_TYPES.includes(newNotif.type)) return;

            const [enriched] = await enrichWithProfilePictures([newNotif]);

            setNotifications(prev => {
                if (prev.some(n => n._id === enriched._id)) return prev;
                if (enriched.type === "FOLLOW_REQUEST") {
                    if (prev.some(n => n.type === "FOLLOW_REQUEST" && n.actor._id === enriched.actor._id)) {
                        return prev.map(n =>
                            n.type === "FOLLOW_REQUEST" && n.actor._id === enriched.actor._id
                                ? { ...enriched, read: false }
                                : n
                        );
                    }
                }
                return [{ ...enriched, read: false }, ...prev];
            });
            setUnreadCount(prev => prev + 1);
            cache.invalidate(COUNT_KEY);
            cache.invalidate(CACHE_KEY);
        };

        socket.on("notification:new", handler);
        return () => { socket.off("notification:new", handler); };
    // hasToken is stable (useCallback with no deps), so this is safe
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch unread count on mount — only once, only if token exists
    useEffect(() => {
        fetchUnreadCount();
    }, [fetchUnreadCount]);

    // When panel opens: always do a fresh API fetch
    useEffect(() => {
        if (!panelOpen) return;
        refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [panelOpen]);

    return {
        notifications,
        unreadCount,
        loading,
        loadingMore,
        hasMore,
        error,
        markRead,
        markAllRead,
        loadMore,
    };
}