"use client";

import { useEffect, useState, useRef } from "react";
import { 
    Search, 
    Users, 
    X, 
    MessageSquarePlus, 
    Camera, 
    Video, 
    Mic, 
    FileText 
} from "lucide-react";
import { getInbox } from "../../lib/api/chatApi";
import { cacheUsers } from "../../lib/userSearchCache";
import { Avatar } from "./Avatar";
import CreateGroupModal from "./CreateGroupModal";

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

const _picCache: Record<string, string | null> = {};

async function enrichThreadsWithProfilePics(threads: Thread[]): Promise<Thread[]> {
    const toFetch = threads.filter(t => t.type === "dm" && t.user && !_picCache[t.user._id]);
    await Promise.allSettled(
        toFetch.map(async t => {
            const username = t.user!.username;
            try {
                const { data } = await import("../../lib/api/api").then(m => m.default.get(`/profile/${username}`));
                const pic = data?.data?.profilePicture ?? data?.data?.profile?.profilePicture ?? null;
                _picCache[t.user!._id] = pic;
            } catch {
                _picCache[t.user!._id] = null;
            }
        })
    );
    return threads.map(t => {
        if (t.type !== "dm" || !t.user) return t;
        const pic = _picCache[t.user._id];
        if (!pic) return t;
        return { ...t, user: { ...t.user, profilePicture: pic } };
    });
}

export default function InboxList({ onSelect, activeId, currentUserId, token, unreadMap }: Props) {
    const [threads, setThreads] = useState<Thread[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showGroupModal, setShowGroupModal] = useState(false);

    useEffect(() => { fetchInbox(); }, []);

    const fetchInbox = async () => {
        try {
            const res = await getInbox();
            const data: Thread[] = res.data?.data ?? [];
            const enriched = await enrichThreadsWithProfilePics(data);
            setThreads(enriched);

            cacheUsers(
                enriched
                    .filter(t => t.type === "dm" && t.user)
                    .map(t => ({
                        _id: t.user!._id,
                        username: t.user!.username,
                        name: t.user!.username,
                        profilePicture: t.user!.profilePicture,
                    }))
            );
        } catch {
            // Error handling
        } finally {
            setLoading(false);
        }
    };

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
            case "file": return <FileText size={14} className="inline mr-1 text-emerald-500" />;
            default: return null;
        }
    };

    const getPreview = (thread: Thread) => {
        const msg = thread.lastMessage;
        if (!msg) return "Start a conversation";
        if (msg.mediaType === "image") return "Photo";
        if (msg.mediaType === "video") return "Video";
        if (msg.mediaType === "audio") return "Voice message";
        if (msg.mediaType === "file") return "File";
        if (!msg.content) return "Sent a message";
        const isMine = msg.senderId === currentUserId;
        const text = msg.content.length > 30 ? msg.content.slice(0, 30) + "…" : msg.content;
        return (isMine ? "You: " : "") + text;
    };

    return (
        <div className="flex flex-col w-full h-full bg-[#f8fafc] dark:bg-[#09090b] transition-colors duration-500 border-r border-zinc-200/50 dark:border-zinc-800/50">
            <style>{`
                @keyframes inboxSlideIn {
                    from { opacity: 0; transform: translateX(-10px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                .inbox-item { animation: inboxSlideIn 0.3s ease both; }

                .active-item {
                    background: white;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.04), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
                }
                .dark .active-item {
                    background: #18181b;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
                }

                .unread-indicator::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 25%;
                    bottom: 25%;
                    width: 4px;
                    background: #3b82f6;
                    border-radius: 0 4px 4px 0;
                }
            `}</style>

            {/* Header */}
            <div className="px-6 pt-10 pb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">Messages</h1>
                    <p className="text-[12px] font-bold text-zinc-400 dark:text-zinc-500 mt-1 uppercase tracking-widest">
                        {threads.length} conversations
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowGroupModal(true)}
                        className="p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all text-zinc-600 dark:text-zinc-400 active:scale-95"
                    >
                        <Users size={20} />
                    </button>
                    <button className="p-3 rounded-2xl bg-black dark:bg-white text-white dark:text-black shadow-lg hover:scale-105 active:scale-95 transition-all">
                        <MessageSquarePlus size={20} />
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="px-6 mb-4">
                <div className="group flex items-center gap-3 bg-zinc-200/50 dark:bg-zinc-900/50 border border-transparent focus-within:border-zinc-300 dark:focus-within:border-zinc-700 rounded-2xl px-4 py-3.5 transition-all">
                    <Search size={18} className="text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" />
                    <input
                        type="text"
                        placeholder="Search chats..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="flex-1 bg-transparent text-[15px] outline-none placeholder-zinc-500 text-zinc-900 dark:text-white font-semibold"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-4 space-y-1 scrollbar-hide">
                {loading ? (
                    <div className="space-y-3">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 p-4 rounded-[28px] bg-zinc-100 dark:bg-zinc-900/40 animate-pulse">
                                <div className="w-14 h-14 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3" />
                                    <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
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
                                    style={{ animationDelay: `${i * 40}ms` }}
                                    className={`inbox-item group w-full flex items-center gap-4 p-4 rounded-[28px] transition-all duration-300 relative mb-1
                                        ${isActive ? "active-item scale-[1.02] z-10" : "hover:bg-zinc-200/30 dark:hover:bg-zinc-900/30"}
                                        ${unread > 0 && !isActive ? "unread-indicator" : ""}
                                    `}
                                >
                                    <div className="relative flex-shrink-0">
                                        <Avatar
                                            src={avatarSrc}
                                            name={name || "Group"}
                                            size={56}
                                            isGroup={thread.type === "group"}
                                            className={`rounded-2xl transition-all duration-500 shadow-sm ${isActive ? 'scale-110 shadow-md' : 'group-hover:scale-105'}`} 
                                        />
                                        {unread > 0 && (
                                            <span className="absolute -top-1 -right-1 flex h-6 w-6">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-6 w-6 bg-blue-600 dark:bg-blue-500 text-[10px] font-black text-white items-center justify-center border-2 border-white dark:border-zinc-900">
                                                    {unread > 9 ? '9+' : unread}
                                                </span>
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <h3 className={`text-[15px] truncate transition-colors ${
                                                isActive || unread > 0 ? "font-black text-zinc-900 dark:text-white" : "font-bold text-zinc-600 dark:text-zinc-400"
                                            }`}>
                                                {name}
                                            </h3>
                                            <span className={`text-[10px] font-black uppercase tracking-tighter ${
                                                isActive || unread > 0 ? "text-blue-600 dark:text-blue-400" : "text-zinc-400"
                                            }`}>
                                                {formatTime(thread.lastActivity)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className={`text-[13px] truncate pr-4 leading-tight ${
                                                unread > 0 && !isActive ? "text-zinc-900 dark:text-zinc-100 font-bold" : "text-zinc-500 dark:text-zinc-500 font-medium"
                                            }`}>
                                                {getPreviewIcon(thread.lastMessage?.mediaType)}
                                                {getPreview(thread)}
                                            </p>
                                            {(isActive || unread > 0) && (
                                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-zinc-400/20' : 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]'}`} />
                                            )}
                                        </div>
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
                        setThreads(prev => [thread, ...prev]);
                        onSelect(thread);
                        setShowGroupModal(false);
                    }}
                />
            )}
        </div>
    );
}