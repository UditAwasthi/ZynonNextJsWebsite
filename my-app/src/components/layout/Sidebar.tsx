"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useNavigation } from "../../hooks/useNavigation";
import { useTheme } from "../../context/ThemeContext";
import {
    Home, Search, Compass, MessageSquare, Play, Heart,
    PlusSquare, User, Moon, Sun, LogOut, Menu, ChevronRight, X
} from "lucide-react";
import { useLayout } from "../../context/LayoutContext";
import CreatePageContent from "../create/CreatePageContent";
import api from "../../lib/api/api";

const iconMap: any = { Home, Search, Compass, MessageSquare, Play, Heart, PlusSquare, User };

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

                {/*
                    onSubmit fires the moment user hits "Execute_Broadcast"
                    — closes the modal immediately while upload continues in background
                */}
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
    const moreMenuRef = useRef<HTMLDivElement>(null);
    const { isCollapsed, setIsCollapsed } = useLayout();

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
                className={`fixed left-0 top-0 h-screen border-r border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black transition-all duration-500 ease-in-out ${
                    isCollapsed ? "w-20" : "w-64"
                }`}
            >
                <div className="absolute inset-0 nothing-dot-grid opacity-[0.03] dark:opacity-[0.07] pointer-events-none" />

                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-12 bg-black dark:bg-white text-white dark:text-black rounded-full p-1.5 border border-zinc-300 dark:border-zinc-700 transition-all duration-300 z-[70] hover:scale-110 shadow-lg"
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

                            if (isCreate) {
                                return (
                                    <button
                                        key={item.href}
                                        onClick={() => setCreateOpen(true)}
                                        className="w-full flex items-center gap-4 p-3 transition-all duration-200 group relative rounded-lg text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                                    >
                                        <div className="shrink-0">
                                            <Icon size={18} strokeWidth={1.5} />
                                        </div>
                                        <div className={`transition-all duration-500 overflow-hidden ${isCollapsed ? "opacity-0 w-0" : "opacity-100 w-40"}`}>
                                            <span className="text-[10px] font-bold tracking-[0.2em] uppercase whitespace-nowrap opacity-70 group-hover:opacity-100">
                                                {item.label}
                                            </span>
                                        </div>
                                    </button>
                                );
                            }

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-4 p-3 transition-all duration-200 group relative rounded-lg ${
                                        isActive
                                            ? "text-black dark:text-white bg-zinc-200/80 dark:bg-zinc-900/80 shadow-sm"
                                            : "text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                                    }`}
                                >
                                    {isActive && <div className="absolute left-0 w-[2.5px] h-6 bg-black dark:bg-white" />}
                                    <div className="shrink-0">
                                        <Icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />
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
                                    onClick={async () => {
                                        try { await api.post("/auth/logout"); } catch { }
                                        localStorage.removeItem("accessToken");
                                        window.location.replace("/login");
                                    }}
                                    className="w-full flex items-center gap-3 p-3 text-[9px] font-bold uppercase tracking-widest text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white transition-colors"
                                >
                                    <div className="shrink-0"><LogOut size={14} /></div>
                                    <span className="whitespace-nowrap">Logout</span>
                                </button>
                            </div>
                        )}

                        <button
                            onClick={() => setShowMore(!showMore)}
                            className={`w-full flex items-center p-3 border transition-all group rounded-lg ${
                                showMore
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
        </div>
    );
};