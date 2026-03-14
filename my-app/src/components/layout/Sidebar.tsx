"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useNavigation } from "../../hooks/useNavigation";
import { useTheme } from "../../context/ThemeContext";
import {
    Home, Search, Compass, MessageSquare, Play, Heart,
    PlusSquare, User, Moon, Sun, LogOut, Menu, ChevronRight, X,
    MonitorX, Shield
} from "lucide-react";
import { useLayout } from "../../context/LayoutContext";
import CreatePageContent from "../create/CreatePageContent";
import api from "../../lib/api/api";
import { NotificationPanel } from "../notifications/Notificationpanel";
import { useNotifications } from "../../hooks/useNotifications";
import { useUnreadMessages } from "../../hooks/useUnreadMessages";

const iconMap: any = { Home, Search, Compass, MessageSquare, Play, Heart, PlusSquare, User };

// ─── Logout Helper ────────────────────────────────────────────────────────────
async function performLogout(endpoint: "/auth/logout" | "/auth/logout-all") {
    try { await api.post(endpoint); } catch { }
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("accessToken");
    window.location.replace("/login");
}

// ─── Logout Modal ─────────────────────────────────────────────────────────────
function LogoutModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [loading, setLoading] = useState<"single" | "all" | null>(null);

    useEffect(() => {
        if (open) document.body.style.overflow = "hidden";
        else document.body.style.overflow = "";
        return () => { document.body.style.overflow = ""; };
    }, [open]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose, loading]);

    const handleLogout = async (type: "single" | "all") => {
        setLoading(type);
        await performLogout(type === "all" ? "/auth/logout-all" : "/auth/logout");
    };

    if (!open || typeof document === "undefined") return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-4"
            style={{
                background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                animation: "lgBgIn 0.18s ease both",
            }}
            onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
        >
            <style>{`
                @keyframes lgBgIn   { from { opacity: 0 } to { opacity: 1 } }
                @keyframes lgSlideIn {
                    from { opacity: 0; transform: translateY(16px) scale(0.98); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes spin { to { transform: rotate(360deg); } }
                .lg-spinner {
                    width: 10px; height: 10px;
                    border: 1.5px solid currentColor;
                    border-top-color: transparent;
                    border-radius: 50%;
                    animation: spin 0.6s linear infinite;
                    display: inline-block;
                }
            `}</style>

            <div
                className="w-full max-w-sm bg-white dark:bg-black border border-black dark:border-zinc-700 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.08)]"
                style={{ animation: "lgSlideIn 0.22s cubic-bezier(0.22,1,0.36,1) both" }}
            >
                {/* Header */}
                <div className="flex items-start justify-between p-5 border-b border-zinc-200 dark:border-zinc-800">
                    <div>
                        <p className="text-[8px] font-bold tracking-[0.3em] uppercase text-zinc-400 dark:text-zinc-500 mb-1">
                            Session Control
                        </p>
                        <h2 className="font-nothing text-base text-black dark:text-white leading-tight">
                            Sign Out
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={!!loading}
                        className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors disabled:opacity-30"
                    >
                        <X size={13} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-2">
                    {/* This device only */}
                    <button
                        onClick={() => handleLogout("single")}
                        disabled={!!loading}
                        className="w-full flex items-center gap-4 p-4 border border-zinc-200 dark:border-zinc-800 hover:border-black dark:hover:border-white hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="w-8 h-8 border border-zinc-300 dark:border-zinc-700 group-hover:border-black dark:group-hover:border-white flex items-center justify-center transition-colors shrink-0">
                            {loading === "single"
                                ? <span className="lg-spinner text-black dark:text-white" />
                                : <LogOut size={14} strokeWidth={1.5} className="text-zinc-600 dark:text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                            }
                        </div>
                        <div className="text-left">
                            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-black dark:text-white">
                                {loading === "single" ? "Signing out…" : "This Device"}
                            </p>
                            <p className="text-[8px] tracking-[0.1em] text-zinc-400 dark:text-zinc-500 mt-0.5 uppercase">
                                Current session only
                            </p>
                        </div>
                    </button>

                    {/* All devices */}
                    <button
                        onClick={() => handleLogout("all")}
                        disabled={!!loading}
                        className="w-full flex items-center gap-4 p-4 border border-zinc-200 dark:border-zinc-800 hover:border-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="w-8 h-8 border border-zinc-300 dark:border-zinc-700 group-hover:border-red-600 flex items-center justify-center transition-colors shrink-0">
                            {loading === "all"
                                ? <span className="lg-spinner text-red-600" />
                                : <MonitorX size={14} strokeWidth={1.5} className="text-zinc-600 dark:text-zinc-400 group-hover:text-red-600 transition-colors" />
                            }
                        </div>
                        <div className="text-left">
                            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-black dark:text-white group-hover:text-red-600 transition-colors">
                                {loading === "all" ? "Signing out everywhere…" : "All Devices"}
                            </p>
                            <p className="text-[8px] tracking-[0.1em] text-zinc-400 dark:text-zinc-500 mt-0.5 uppercase">
                                Revoke all active sessions
                            </p>
                        </div>
                    </button>
                </div>

                {/* Footer */}
                <div className="px-5 pb-5">
                    <button
                        onClick={onClose}
                        disabled={!!loading}
                        className="w-full p-3 text-[9px] font-bold tracking-[0.25em] uppercase text-zinc-400 dark:text-zinc-600 hover:text-black dark:hover:text-white border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 transition-all disabled:opacity-30"
                    >
                        Abort / Stay Logged In
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────
function CreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    useEffect(() => {
        if (open) document.body.style.overflow = "hidden";
        else document.body.style.overflow = "";
        return () => { document.body.style.overflow = ""; };
    }, [open]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    if (!open || typeof document === "undefined") return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center p-4 md:p-8"
            style={{
                background: "rgba(0,0,0,0.72)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                animation: "cmBgIn 0.2s ease both",
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <style>{`
                @keyframes cmBgIn    { from { opacity: 0 } to { opacity: 1 } }
                @keyframes cmSlideIn {
                    from { opacity: 0; transform: translateY(24px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0)    scale(1);    }
                }
            `}</style>

            <div
                className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-[28px] bg-[#F0F0EB] dark:bg-[#0A0A0A] shadow-2xl"
                style={{ animation: "cmSlideIn 0.26s cubic-bezier(0.22,1,0.36,1) both" }}
            >
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 z-50 w-9 h-9 rounded-full bg-black/[0.07] dark:bg-white/[0.07] hover:bg-red-600 hover:text-white flex items-center justify-center transition-all duration-200 text-zinc-500 dark:text-zinc-400"
                    aria-label="Close"
                >
                    <X size={15} />
                </button>
                <CreatePageContent onSubmit={onClose} />
            </div>
        </div>,
        document.body
    );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export const Sidebar = () => {
    const { navItems, pathname } = useNavigation();
    const { isDark, toggleTheme } = useTheme();
    const [showMore, setShowMore] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [logoutOpen, setLogoutOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const moreMenuRef = useRef<HTMLDivElement>(null);
    const { isCollapsed, setIsCollapsed } = useLayout();

    // ── Single hook instance — owns ALL notification state ────────────────────
    // Previously useNotifications(false) ran here AND inside NotificationPanel,
    // creating two separate instances that raced each other on 401 → refresh.
    // Now one instance drives both the badge count and the panel.
    const {
        notifications,
        unreadCount,
        loading,
        loadingMore,
        hasMore,
        error,
        markRead,
        markAllRead,
        loadMore,
    } = useNotifications(notifOpen);

    const { hasUnreadMessages } = useUnreadMessages();

    // Sidebar pixel width for panel positioning
    const sidebarWidth = isCollapsed ? 80 : 256;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
                setShowMore(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative z-50">
            <aside
                className={`hidden md:flex md:fixed left-0 top-0 h-screen border-r border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black transition-all duration-500 ease-in-out flex-col ${isCollapsed ? "w-20" : "w-64"}`}
            >
                <div className="absolute inset-0 nothing-dot-grid opacity-[0.03] dark:opacity-[0.07] pointer-events-none" />

                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="hidden md:block absolute -right-3 top-12 bg-black dark:bg-white text-white dark:text-black rounded-full p-1.5 border border-zinc-300 dark:border-zinc-700 transition-all duration-300 z-[70] hover:scale-110 shadow-lg"
                    style={{ transform: isCollapsed ? "rotate(0deg)" : "rotate(180deg)" }}
                >
                    <ChevronRight size={12} strokeWidth={3} />
                </button>

                <div className="relative z-10 flex flex-col h-full p-4 overflow-hidden">

                    {/* Logo */}
                    <div className="flex items-center gap-4 px-2 py-8 mb-4 shrink-0">
                        <div className="w-10 h-10 flex items-center justify-center border border-black dark:border-white rounded-full bg-transparent shrink-0">
                            <span className="font-nothing text-lg text-black dark:text-white">Z</span>
                        </div>
                        <div className={`flex flex-col transition-all duration-500 ${isCollapsed ? "opacity-0 w-0" : "opacity-100 w-40"}`}>
                            <span className="font-nothing text-xl tracking-[0.1em] text-black dark:text-white leading-none whitespace-nowrap">
                                Zynon
                            </span>
                            <div className="flex items-center gap-1.5 mt-1 whitespace-nowrap">
                                <div className="w-1 h-1 rounded-full bg-green-600 dark:bg-green-400 animate-pulse" />
                                <span className="text-[8px] tracking-[0.2em] text-zinc-800 dark:text-zinc-300 uppercase font-bold">
                                    System Active
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1 mt-4 overflow-y-auto no-scrollbar">
                        {navItems.map((item) => {
                            const Icon = iconMap[item.icon];
                            const isActive = pathname === item.href;
                            const isCreate = item.icon === "PlusSquare";
                            const isNotif = item.icon === "Heart";
                            const isMessage = item.icon === "MessageSquare";

                            // ── Create button ────────────────────────────────
                            if (isCreate) {
                                return (
                                    <div key={item.href} className="py-4 my-2 px-2">
                                        <button
                                            onClick={() => setCreateOpen(true)}
                                            className={`
                                                relative w-full flex items-center gap-4 p-3
                                                transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]
                                                group rounded-[22px] overflow-hidden
                                                ${isCollapsed ? "justify-center h-12 w-12 mx-auto" : "px-4 h-14"}
                                                bg-black dark:bg-white text-white dark:text-black
                                                shadow-[0_10px_20px_-10px_rgba(0,0,0,0.5)] dark:shadow-[0_10px_20px_-10px_rgba(255,255,255,0.2)]
                                                hover:scale-[1.03] hover:shadow-[0_15px_25px_-10px_rgba(0,0,0,0.6)] active:scale-95
                                            `}
                                        >
                                            <div className="absolute top-3 right-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#FF0000] shadow-[0_0_8px_#FF0000] animate-pulse" />
                                            </div>
                                            <div
                                                className="absolute inset-0 opacity-[0.15] pointer-events-none"
                                                style={{
                                                    backgroundImage: `radial-gradient(circle, currentColor 0.5px, transparent 0.5px)`,
                                                    backgroundSize: '4px 4px'
                                                }}
                                            />
                                            <div className="relative z-10 shrink-0 flex items-center justify-center">
                                                <div className="w-8 h-8 rounded-full border border-white/20 dark:border-black/10 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-black group-hover:text-black dark:group-hover:text-white transition-all duration-300">
                                                    <PlusSquare size={16} strokeWidth={2} className="group-hover:rotate-90 transition-transform duration-500" />
                                                </div>
                                            </div>
                                            <div className={`relative z-10 transition-all duration-500 overflow-hidden ${isCollapsed ? "opacity-0 w-0" : "opacity-100 w-24 ml-1"}`}>
                                                <span className="text-[10px] font-black tracking-[0.4em] uppercase whitespace-nowrap">{item.label}</span>
                                                <div className="mt-0.5 h-[1px] w-4 bg-current opacity-30 group-hover:w-full transition-all duration-500" />
                                            </div>
                                        </button>
                                    </div>
                                );
                            }

                            // ── Notifications button ─────────────────────────
                            if (isNotif) {
                                const isNotifActive = notifOpen;
                                return (
                                    <button
                                        key={item.href}
                                        onClick={() => setNotifOpen(prev => !prev)}
                                        className={`w-full cursor-pointer flex items-center gap-2 p-3 transition-all duration-200 group relative rounded-lg ${isNotifActive
                                            ? "text-black dark:text-white bg-zinc-200/80 dark:bg-zinc-900/80 shadow-sm"
                                            : "text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                                            }`}
                                    >
                                        {isNotifActive && <div className="absolute left-0 w-[0px] h-6 bg-black dark:bg-white" />}

                                        {/* Icon + badge */}
                                        <div className="relative shrink-0">
                                            <Heart size={18} strokeWidth={isNotifActive ? 2.5 : 1.5} />
                                            {unreadCount > 0 && (
                                                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-[3px] flex items-center justify-center bg-red-500 text-white text-[9px] font-black rounded-full border-2 border-white dark:border-black leading-none pointer-events-none">
                                                    {unreadCount > 99 ? "99+" : unreadCount}
                                                </span>
                                            )}
                                        </div>

                                        <div className={`transition-all duration-500 overflow-hidden ${isCollapsed ? "opacity-0 w-0" : "opacity-100 w-30"}`}>
                                            <span className={`text-[10px] font-bold tracking-[0.2em] uppercase whitespace-nowrap ${isNotifActive ? "opacity-100" : "opacity-70 group-hover:opacity-100"}`}>
                                                {item.label}
                                            </span>
                                        </div>
                                    </button>
                                );
                            }

                            // ── Regular nav link ─────────────────────────────
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-4 p-3 transition-all duration-200 group relative rounded-lg ${isActive
                                        ? "text-black dark:text-white bg-zinc-200/80 dark:bg-zinc-900/80 shadow-sm"
                                        : "text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                                        }`}
                                >
                                    {isActive && <div className="absolute left-0 w-[2.5px] h-6 bg-black dark:bg-white" />}
                                    <div className="relative shrink-0">
                                        <Icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />
                                        {isMessage && hasUnreadMessages && (
                                            <span className="absolute -top-1 -right-1 w-[9px] h-[9px] rounded-full bg-red-500 border-2 border-white dark:border-black pointer-events-none" />
                                        )}
                                    </div>
                                    <div className={`transition-all duration-500 overflow-hidden ${isCollapsed ? "opacity-0 w-0" : "opacity-100 w-40"}`}>
                                        <span className={`text-[10px] font-bold tracking-[0.2em] uppercase whitespace-nowrap ${isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100"}`}>
                                            {item.label}
                                        </span>
                                    </div>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* More Menu */}
                    <div className="relative mt-auto pt-6 border-t border-zinc-300 dark:border-zinc-800" ref={moreMenuRef}>
                        {showMore && (
                            <div className="absolute bottom-20 left-0 w-full bg-white dark:bg-black border border-black dark:border-zinc-700 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] p-1 z-[70] animate-in slide-in-from-bottom-2">
                                <button
                                    onClick={toggleTheme}
                                    className="w-full flex items-center gap-3 p-3 text-[9px] font-bold uppercase tracking-widest text-zinc-900 dark:text-zinc-100 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                                >
                                    <div className="shrink-0">{isDark ? <Sun size={14} /> : <Moon size={14} />}</div>
                                    <span className="whitespace-nowrap">Appearance</span>
                                </button>
                                <button
                                    onClick={() => { setShowMore(false); setLogoutOpen(true); }}
                                    className="w-full flex items-center gap-3 p-3 text-[9px] font-bold uppercase tracking-widest text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white transition-colors"
                                >
                                    <div className="shrink-0"><LogOut size={14} /></div>
                                    <span className="whitespace-nowrap">Logout</span>
                                </button>
                            </div>
                        )}

                        <button
                            onClick={() => setShowMore(!showMore)}
                            className={`w-full flex items-center p-3 border transition-all group rounded-lg ${showMore
                                ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white"
                                : "border-zinc-300 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white"
                                }`}
                        >
                            <div className="shrink-0"><Menu size={18} strokeWidth={1.5} /></div>
                            <div className={`flex items-center justify-between transition-all duration-500 overflow-hidden ${isCollapsed ? "opacity-0 w-0" : "opacity-100 w-full ml-4"}`}>
                                <span className="text-[10px] font-bold tracking-[0.2em] uppercase whitespace-nowrap">Options</span>
                                <span className="text-[8px] opacity-40 group-hover:opacity-100">01</span>
                            </div>
                        </button>
                    </div>
                </div>
            </aside>

            <CreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
            <LogoutModal open={logoutOpen} onClose={() => setLogoutOpen(false)} />

            {/* Panel receives data from the single hook instance above — no second hook inside */}
            <NotificationPanel
                open={notifOpen}
                onClose={() => setNotifOpen(false)}
                sidebarWidth={sidebarWidth}
                notifications={notifications}
                unreadCount={unreadCount}
                loading={loading}
                loadingMore={loadingMore}
                hasMore={hasMore}
                error={error}
                markRead={markRead}
                markAllRead={markAllRead}
                loadMore={loadMore}
            />

            {/* ── Mobile top bar — md:hidden ─────────────────────────────────
                Logo on left · Messages + Notifications on right
            ────────────────────────────────────────────────────────────────── */}
            <header
                className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800"
                style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
            >
                <div className="flex items-center justify-between px-4 h-14">

                    {/* Logo */}
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 flex items-center justify-center border border-black dark:border-white rounded-full bg-transparent shrink-0">
                            <span className="font-nothing text-base text-black dark:text-white">Z</span>
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="font-nothing text-[17px] tracking-[0.1em] text-black dark:text-white">Zynon</span>
                            <div className="flex items-center gap-1 mt-0.5">
                                <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[7px] tracking-[0.2em] text-zinc-400 uppercase font-bold">Active</span>
                            </div>
                        </div>
                    </div>

                    {/* Right actions — Notifications · Search · Messages */}
                    <div className="flex items-center gap-1">

                        {/* Notifications */}
                        <button
                            onClick={() => setNotifOpen(p => !p)}
                            className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-colors ${notifOpen ? "text-black dark:text-white bg-zinc-100 dark:bg-zinc-900" : "text-zinc-500 dark:text-zinc-400"}`}>
                            <Heart size={20} strokeWidth={notifOpen ? 2.5 : 1.5} />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-[3px] flex items-center justify-center bg-red-500 text-white text-[8px] font-black rounded-full border-2 border-white dark:border-black leading-none">
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Search */}
                        <Link href="/search"
                            className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-colors ${pathname === "/explore" ? "text-black dark:text-white bg-zinc-100 dark:bg-zinc-900" : "text-zinc-500 dark:text-zinc-400"}`}>
                            <Search size={20} strokeWidth={pathname === "/explore" ? 2.5 : 1.5} />
                        </Link>

                        {/* Messages */}
                        <Link href="/messages"
                            className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-colors ${pathname === "/messages" ? "text-black dark:text-white bg-zinc-100 dark:bg-zinc-900" : "text-zinc-500 dark:text-zinc-400"}`}>
                            <MessageSquare size={20} strokeWidth={pathname === "/messages" ? 2.5 : 1.5} />
                            {hasUnreadMessages && pathname !== "/messages" && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white dark:border-black" />
                            )}
                        </Link>

                    </div>
                </div>
            </header>

            {/* ── Mobile bottom tab bar — md:hidden ──────────────────────────
                Home · Explore · [Create] · Reels · Profile
            ────────────────────────────────────────────────────────────────── */}
            <nav
                className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-t border-zinc-200 dark:border-zinc-800"
                style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
            >
                <div className="flex items-center justify-around px-2 h-16">

                    {/* 1 — Home */}
                    <Link href="/home"
                        className={`relative flex items-center justify-center w-12 h-12 transition-colors ${pathname === "/home" ? "text-black dark:text-white" : "text-zinc-400 dark:text-zinc-600"}`}>
                        <Home size={22} strokeWidth={pathname === "/home" ? 2.5 : 1.5} />
                        {pathname === "/home" && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-black dark:bg-white" />}
                    </Link>

                    {/* 2 — Explore */}
                    <Link href="/explore"
                        className={`relative flex items-center justify-center w-12 h-12 transition-colors ${pathname === "/explore" ? "text-black dark:text-white" : "text-zinc-400 dark:text-zinc-600"}`}>
                        <Compass size={22} strokeWidth={pathname === "/explore" ? 2.5 : 1.5} />
                        {pathname === "/explore" && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-black dark:bg-white" />}
                    </Link>

                    {/* 3 — Create (centre, elevated pill) */}
                    <button
                        onClick={() => setCreateOpen(true)}
                        className="flex items-center justify-center w-12 h-12 rounded-[16px] bg-black dark:bg-white text-white dark:text-black shadow-[0_6px_20px_-6px_rgba(0,0,0,0.55)] dark:shadow-[0_6px_20px_-6px_rgba(255,255,255,0.2)] active:scale-90 transition-transform"
                    >
                        <PlusSquare size={22} strokeWidth={2} />
                    </button>

                    {/* 4 — Reels */}
                    <Link href="/reels"
                        className={`relative flex items-center justify-center w-12 h-12 transition-colors ${pathname === "/reels" ? "text-black dark:text-white" : "text-zinc-400 dark:text-zinc-600"}`}>
                        <Play size={22} strokeWidth={pathname === "/reels" ? 2.5 : 1.5} />
                        {pathname === "/reels" && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-black dark:bg-white" />}
                    </Link>

                    {/* 5 — Profile */}
                    <Link href="/profile"
                        className={`relative flex items-center justify-center w-12 h-12 transition-colors ${pathname === "/profile" ? "text-black dark:text-white" : "text-zinc-400 dark:text-zinc-600"}`}>
                        <User size={22} strokeWidth={pathname === "/profile" ? 2.5 : 1.5} />
                        {pathname === "/profile" && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-black dark:bg-white" />}
                    </Link>

                </div>
            </nav>
        </div>
    );
};