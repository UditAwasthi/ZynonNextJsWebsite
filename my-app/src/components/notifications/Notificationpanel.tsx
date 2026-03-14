"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { X, Bell, CheckCheck, Loader } from "lucide-react";
import { NotificationItem } from "./Notificationitem";
import type { Notification } from "./types";

interface Props {
    open: boolean;
    onClose: () => void;
    sidebarWidth: number;
    // All notification state is owned by Sidebar via useNotifications(notifOpen).
    // The panel is purely presentational — no hook instance here.
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    loadingMore: boolean;
    hasMore: boolean;
    error: string | null;
    markRead: (ids: string[]) => void;
    markAllRead: () => void;
    loadMore: () => void;
}

// ── Shared body content — used by both mobile and desktop panels ─────────────
function NotificationBody({ loading, error, notifications, loadingMore, hasMore, markRead }: {
    loading: boolean; error: string | null; notifications: Notification[];
    loadingMore: boolean; hasMore: boolean; markRead: (ids: string[]) => void;
}) {
    return (
        <>
            {loading && (
                <div className="flex flex-col">
                    {[...Array(7)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-900 animate-pulse">
                            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 bg-zinc-100 dark:bg-zinc-900 rounded w-3/4" />
                                <div className="h-2 bg-zinc-100 dark:bg-zinc-900 rounded w-1/4" />
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {error && !loading && (
                <div className="flex flex-col items-center justify-center h-40 gap-2 px-6">
                    <X size={20} className="text-red-400" />
                    <p className="text-[11px] text-red-500 font-medium text-center">{error}</p>
                </div>
            )}
            {!loading && !error && notifications.length === 0 && (
                <div className="flex flex-col items-center justify-center h-56 gap-4 px-6">
                    <div className="w-12 h-12 rounded-full border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                        <Bell size={18} strokeWidth={1.5} className="text-zinc-400" />
                    </div>
                    <div className="text-center">
                        <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">All caught up</p>
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-600 mt-1">No notifications yet</p>
                    </div>
                </div>
            )}
            {!loading && notifications.map(n => (
                <NotificationItem key={n._id} notification={n} onRead={(id) => markRead([id])} />
            ))}
            {loadingMore && (
                <div className="flex justify-center py-4">
                    <Loader size={16} className="text-zinc-400 animate-spin" />
                </div>
            )}
            {!loading && !loadingMore && !hasMore && notifications.length > 0 && (
                <div className="flex items-center gap-3 px-4 py-4">
                    <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-900" />
                    <p className="text-[9px] font-bold tracking-[0.25em] uppercase text-zinc-300 dark:text-zinc-700">You're all caught up</p>
                    <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-900" />
                </div>
            )}
        </>
    )
}

export function NotificationPanel({
    open,
    onClose,
    sidebarWidth,
    notifications,
    unreadCount,
    loading,
    loadingMore,
    hasMore,
    error,
    markRead,
    markAllRead,
    loadMore,
}: Props) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const scrollRef = useRef<HTMLDivElement>(null);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onClose]);

    // Infinite scroll
    const handleScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el || loadingMore || !hasMore) return;
        if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) loadMore();
    }, [loadMore, loadingMore, hasMore]);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.addEventListener("scroll", handleScroll, { passive: true });
        return () => el.removeEventListener("scroll", handleScroll);
    }, [handleScroll]);

    if (!mounted) return null;

    // Inject no-scrollbar style once
    const noScrollbarStyle = `.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`;

    // On mobile (no sidebar): full-screen slide-up from bottom
    // On desktop (md+): slide in from left edge of sidebar
    const desktopStyle: React.CSSProperties = {
        left: sidebarWidth,
        transform: open ? "translateX(0)" : "translateX(-8px)",
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
        transition: open
            ? "transform 0.2s cubic-bezier(0.22,1,0.36,1), opacity 0.15s ease"
            : "transform 0.15s ease, opacity 0.15s ease",
        visibility: open ? "visible" : "hidden",
    };

    const mobileStyle: React.CSSProperties = {
        transform: open ? "translateY(0)" : "translateY(100%)",
        opacity: open ? 1 : 0,
        transition: open
            ? "transform 0.3s cubic-bezier(0.22,1,0.36,1), opacity 0.2s ease"
            : "transform 0.2s ease, opacity 0.15s ease",
        visibility: open ? "visible" : "hidden",
    };

    return createPortal(
        <>
            <style>{noScrollbarStyle}</style>
            {/* Backdrop */}
            {open && (
                <div
                    className="fixed inset-0 z-[200]"
                    style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }}
                    onClick={onClose}
                />
            )}

            {/* ── MOBILE panel — slides up from bottom, full width ── */}
            <div
                className="md:hidden fixed bottom-0 left-0 right-0 z-[210] flex flex-col bg-white dark:bg-black border-t border-zinc-200 dark:border-zinc-800 shadow-2xl"
                style={{ ...mobileStyle, height: "85dvh", borderRadius: "20px 20px 0 0" }}
                onClick={e => e.stopPropagation()}
            >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1 shrink-0">
                    <div className="w-10 h-1 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                </div>

                {/* Header */}
                <div className="relative z-10 flex items-center justify-between px-5 pt-3 pb-4 border-b border-zinc-100 dark:border-zinc-900 shrink-0">
                    <div>
                        <p className="text-[8px] font-bold tracking-[0.3em] uppercase text-zinc-400 dark:text-zinc-500 mb-1">Activity</p>
                        <div className="flex items-center gap-2">
                            <h2 className="font-nothing text-[15px] text-black dark:text-white leading-none">Notifications</h2>
                            {unreadCount > 0 && (
                                <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-black dark:bg-white text-white dark:text-black text-[8px] font-black">
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                            <button onClick={markAllRead} className="flex items-center gap-1.5 px-2.5 py-1.5 text-[8px] font-bold tracking-[0.15em] uppercase border border-zinc-200 dark:border-zinc-800 hover:border-black dark:hover:border-white text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-all">
                                <CheckCheck size={10} /> Mark all read
                            </button>
                        )}
                        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center border border-zinc-200 dark:border-zinc-800 hover:border-black dark:hover:border-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black text-zinc-400 transition-all">
                            <X size={12} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto no-scrollbar">
                    <NotificationBody
                        loading={loading} error={error} notifications={notifications}
                        loadingMore={loadingMore} hasMore={hasMore}
                        markRead={markRead}
                    />
                </div>

                {/* Footer */}
                <div className="relative z-10 px-5 py-3 border-t border-zinc-100 dark:border-zinc-900 shrink-0 flex items-center gap-2"
                    style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[8px] font-bold tracking-[0.25em] uppercase text-zinc-400 dark:text-zinc-600">Live updates</span>
                </div>
            </div>

            {/* ── DESKTOP panel — slides in from sidebar edge ── */}
            <div
                className="hidden md:flex fixed top-0 h-screen z-[210] w-[360px] flex-col bg-white dark:bg-black border-r border-zinc-200 dark:border-zinc-800 shadow-xl"
                style={desktopStyle}
                onClick={e => e.stopPropagation()}
            >
                {/* Dot grid */}
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06] pointer-events-none"
                    style={{ backgroundImage: `radial-gradient(circle, currentColor 0.5px, transparent 0.5px)`, backgroundSize: "4px 4px" }} />

                {/* Header */}
                <div className="relative z-10 flex items-center justify-between px-5 pt-6 pb-4 border-b border-zinc-100 dark:border-zinc-900 shrink-0">
                    <div>
                        <p className="text-[8px] font-bold tracking-[0.3em] uppercase text-zinc-400 dark:text-zinc-500 mb-1">Activity</p>
                        <div className="flex items-center gap-2">
                            <h2 className="font-nothing text-[15px] text-black dark:text-white leading-none">Notifications</h2>
                            {unreadCount > 0 && (
                                <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-black dark:bg-white text-white dark:text-black text-[8px] font-black">
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                            <button onClick={markAllRead} className="flex items-center gap-1.5 px-2.5 py-1.5 text-[8px] font-bold tracking-[0.15em] uppercase border border-zinc-200 dark:border-zinc-800 hover:border-black dark:hover:border-white text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-all">
                                <CheckCheck size={10} /> Mark all read
                            </button>
                        )}
                        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center border border-zinc-200 dark:border-zinc-800 hover:border-black dark:hover:border-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black text-zinc-400 transition-all">
                            <X size={12} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto no-scrollbar">
                    <NotificationBody
                        loading={loading} error={error} notifications={notifications}
                        loadingMore={loadingMore} hasMore={hasMore}
                        markRead={markRead}
                    />
                </div>

                {/* Footer */}
                <div className="relative z-10 px-5 py-3 border-t border-zinc-100 dark:border-zinc-900 shrink-0 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[8px] font-bold tracking-[0.25em] uppercase text-zinc-400 dark:text-zinc-600">Live updates</span>
                </div>
            </div>
        </>,
        document.body
    );
}