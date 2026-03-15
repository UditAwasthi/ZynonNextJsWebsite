"use client";

import { useState } from "react";
import {
    Search, Users, MessageSquarePlus,
    Camera, Video, Mic, FileText
} from "lucide-react";
import { cacheUsers } from "../../lib/userSearchCache";
import { Avatar } from "./Avatar";
import CreateGroupModal from "./CreateGroupModal";
import { useInbox } from "../../hooks/useInbox";

export interface Thread {
    threadId: string;
    type: "dm" | "group";
    user: { _id: string; username: string; profilePicture?: string } | null;
    name?: string;
    avatar?: string;
    lastMessage: {
        content?: string;
        createdAt?: string;
        senderId?: string;
        mediaType?: string;
    } | null;
    lastActivity: string;
}

interface Props {
    onSelect: (thread: Thread) => void;
    activeId?: string;
    currentUserId: string;
    token: string;
    unreadMap: Record<string, number>;
}

export default function InboxList({ onSelect, activeId, currentUserId, token, unreadMap }: Props) {
    const { threads, loading, prependThread } = useInbox(token, currentUserId);
    const [search, setSearch] = useState("");
    const [showGroupModal, setShowGroupModal] = useState(false);

    // Cache DM users for the UserSearchInput autocomplete
    if (threads.length > 0) {
        cacheUsers(
            threads
                .filter(t => t.type === "dm" && t.user)
                .map(t => ({
                    _id: t.user!._id,
                    username: t.user!.username,
                    name: t.user!.username,
                    profilePicture: t.user!.profilePicture,
                }))
        );
    }

    const filtered = threads.filter(t => {
        const name = t.type === "dm" ? t.user?.username : t.name;
        return name?.toLowerCase().includes(search.toLowerCase());
    });

    const formatTime = (iso?: string) => {
        if (!iso) return "";
        const d = new Date(iso);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffMins < 1) return "now";
        if (diffMins < 60) return `${diffMins}m`;
        if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        if (diffDays === 1) return "Yesterday";
        if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
        return d.toLocaleDateString([], { month: "short", day: "numeric" });
    };

    const getPreviewIcon = (type?: string) => {
        switch (type) {
            case "image": return <Camera size={14} className="inline mr-1 text-blue-500" />;
            case "video": return <Video size={14} className="inline mr-1 text-purple-500" />;
            case "audio": return <Mic size={14} className="inline mr-1 text-red-500" />;
            case "file":  return <FileText size={14} className="inline mr-1 text-emerald-500" />;
            default: return null;
        }
    };

    const getPreview = (thread: Thread) => {
        const msg = thread.lastMessage;
        if (!msg) return "Start a conversation";
        if (msg.mediaType === "image") return "📷 Photo";
        if (msg.mediaType === "video") return "🎥 Video";
        if (msg.mediaType === "audio") return "🎤 Voice message";
        if (msg.mediaType === "file")  return "📄 File";
        if (!msg.content) return "Sent a message";
        const isMine = msg.senderId === currentUserId;
        const text = msg.content.length > 32 ? msg.content.slice(0, 32) + "…" : msg.content;
        return (isMine ? "You: " : "") + text;
    };

    return (
    <div
        className="flex flex-col w-full bg-white/40 dark:bg-black/40 backdrop-blur-3xl transition-colors duration-500 border-r border-white/20 dark:border-zinc-800/20
                    h-[calc(100dvh-56px-64px-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))]
                    md:h-full relative overflow-hidden"
    >
        {/* Organic Background Blobs for Glass depth */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-400/10 dark:bg-blue-600/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute top-1/2 -right-24 w-72 h-72 bg-purple-400/10 dark:bg-purple-600/5 rounded-full blur-[100px] pointer-events-none" />

        <style>{`
            @keyframes glassSlideIn {
                from { opacity: 0; transform: translateY(12px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .inbox-item { 
                animation: glassSlideIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both; 
            }
            .active-item {
                background: rgba(255, 255, 255, 0.7);
                backdrop-filter: blur(12px);
                box-shadow: 0 8px 32px -4px rgba(0,0,0,0.05);
            }
            .dark .active-item {
                background: rgba(39, 39, 42, 0.6);
                box-shadow: 0 12px 40px -8px rgba(0,0,0,0.4);
            }
            /* Material You styled scrollbar */
            .scrollbar-glass::-webkit-scrollbar { width: 4px; }
            .scrollbar-glass::-webkit-scrollbar-thumb { 
                background: rgba(0,0,0,0.1); 
                border-radius: 20px; 
            }
            .dark .scrollbar-glass::-webkit-scrollbar-thumb { 
                background: rgba(255,255,255,0.1); 
            }
        `}</style>

        {/* Header */}
        <div className="px-7 pt-6 md:pt-12 pb-6 flex items-center justify-between z-10">
            <div>
                <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Messages</h1>
                <p className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400 mt-1.5 opacity-80">
                    {threads.length} active circles
                </p>
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={() => setShowGroupModal(true)}
                    className="p-3.5 rounded-2xl bg-white/50 dark:bg-zinc-800/40 backdrop-blur-md border border-white/40 dark:border-white/5 hover:bg-white/80 dark:hover:bg-zinc-800/60 transition-all active:scale-95 shadow-sm"
                >
                    <Users size={20} className="text-zinc-700 dark:text-zinc-300" />
                </button>
                <button className="p-3.5 rounded-[22px] bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black shadow-xl hover:shadow-zinc-500/20 transition-all active:scale-90">
                    <MessageSquarePlus size={20} />
                </button>
            </div>
        </div>

        {/* Search - Integrated Glass Design */}
        <div className="px-6 mb-6 z-10">
            <div className="group flex items-center gap-3 bg-white/30 dark:bg-zinc-900/30 backdrop-blur-xl border border-white/40 dark:border-white/5 focus-within:bg-white/60 dark:focus-within:bg-zinc-900/50 rounded-[24px] px-5 py-3.5 transition-all duration-300">
                <Search size={18} className="text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-zinc-100" />
                <input
                    type="text"
                    placeholder="Search conversations"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="flex-1 bg-transparent text-[15px] outline-none placeholder-zinc-500 text-zinc-800 dark:text-zinc-100 font-medium"
                />
            </div>
        </div>

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto px-4 space-y-1.5 scrollbar-glass z-10">
            {loading ? (
                <div className="space-y-4 px-2">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-[32px] bg-white/20 dark:bg-white/5 animate-pulse">
                            <div className="w-14 h-14 rounded-full bg-zinc-200/50 dark:bg-zinc-800/50" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-full w-1/3" />
                                <div className="h-3 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-full w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="pb-10">
                    {filtered.map((thread, i) => {
                        const unread = unreadMap[thread.threadId] ?? 0;
                        const isActive = thread.threadId === activeId;
                        const name = thread.type === "dm" ? thread.user?.username : thread.name;
                        const avatarSrc = thread.type === "dm" ? thread.user?.profilePicture : thread.avatar;

                        return (
                            <button
                                key={thread.threadId}
                                onClick={() => onSelect(thread)}
                                style={{ animationDelay: `${i * 50}ms` }}
                                className={`inbox-item group w-full flex items-center gap-4 p-4 rounded-[32px] transition-all duration-500 relative mb-1.5
                                    ${isActive 
                                        ? "active-item scale-[0.98] ring-1 ring-white/50 dark:ring-white/10" 
                                        : "hover:bg-white/40 dark:hover:bg-white/5"}
                                `}
                            >
                                <div className="relative flex-shrink-0">
                                    <Avatar
                                        src={avatarSrc}
                                        name={name || "Group"}
                                        size={58}
                                        isGroup={thread.type === "group"}
                                        className={`rounded-full transition-transform duration-700 ${isActive ? "scale-90" : "group-hover:scale-105"}`}
                                    />
                                    {unread > 0 && (
                                        <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5">
                                            <span className="relative inline-flex rounded-full h-5 w-5 bg-zinc-900 dark:bg-zinc-100 text-[10px] font-bold text-white dark:text-black items-center justify-center border-2 border-white dark:border-zinc-900">
                                                {unread > 9 ? "9" : unread}
                                            </span>
                                        </span>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0 text-left">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <h3 className={`text-[16px] truncate tracking-tight transition-colors ${
                                            isActive || unread > 0
                                                ? "font-semibold text-zinc-900 dark:text-zinc-50"
                                                : "font-medium text-zinc-600 dark:text-zinc-400"
                                        }`}>
                                            {name}
                                        </h3>
                                        <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                                            {formatTime(thread.lastActivity)}
                                        </span>
                                    </div>
                                    <p className={`text-[14px] truncate pr-8 leading-relaxed ${
                                        unread > 0 && !isActive
                                            ? "text-zinc-900 dark:text-zinc-200 font-semibold"
                                            : "text-zinc-500 dark:text-zinc-500 font-normal"
                                    }`}>
                                        {getPreviewIcon(thread.lastMessage?.mediaType)}
                                        {getPreview(thread)}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>

        {showGroupModal && (
            <CreateGroupModal
                onClose={() => setShowGroupModal(false)}
                onCreated={(thread) => {
                    prependThread(thread);
                    onSelect(thread);
                    setShowGroupModal(false);
                }}
            />
        )}
    </div>
);
}