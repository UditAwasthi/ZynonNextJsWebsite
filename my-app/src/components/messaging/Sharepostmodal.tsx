"use client";

import { useEffect, useState, useRef } from "react";
import { X, Search, Send, Check } from "lucide-react";
import { getInbox, createOrGetDMThread, sendMessage } from "../../lib/api/chatApi";
import { searchUsers } from "../../lib/userSearchCache";
import { Avatar } from "./Avatar";
import type { Thread } from "./InboxList";
import type { SearchUser } from "../../lib/api/search";

type Recipient = {
    id: string;        // threadId or userId
    kind: "thread" | "user";
    name: string;
    avatarSrc?: string;
    isGroup?: boolean;
};

interface Props {
    postId: string;
    postPreview?: { imageUrl?: string; caption?: string };
    onClose: () => void;
}

export default function SharePostModal({ postId, postPreview, onClose }: Props) {
    const [threads, setThreads] = useState<Thread[]>([]);
    const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<Recipient[]>([]);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [loadingThreads, setLoadingThreads] = useState(true);
    const [searching, setSearching] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        getInbox()
            .then(res => setThreads(res.data?.data ?? []))
            .catch(() => {})
            .finally(() => setLoadingThreads(false));
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    useEffect(() => {
        if (timer.current !== null) clearTimeout(timer.current ?? undefined);
        if (!query.trim()) { setSearchResults([]); return; }
        setSearching(true);
        timer.current = setTimeout(async () => {
            try {
                setSearchResults(await searchUsers(query));
            } catch {
            } finally {
                setSearching(false);
            }
        }, 250);
    }, [query]);

    const isSelected = (id: string) => selected.some(s => s.id === id);

    const toggleThread = (t: Thread) => {
        const id = t.threadId;
        if (isSelected(id)) { setSelected(prev => prev.filter(s => s.id !== id)); return; }
        const name = t.type === "dm" ? t.user?.username ?? "Unknown" : t.name ?? "Group";
        setSelected(prev => [...prev, {
            id, kind: "thread", name,
            avatarSrc: t.type === "dm" ? t.user?.profilePicture : t.avatar,
            isGroup: t.type === "group",
        }]);
    };

    const toggleUser = (u: SearchUser) => {
        if (isSelected(u._id)) { setSelected(prev => prev.filter(s => s.id !== u._id)); return; }
        setSelected(prev => [...prev, {
            id: u._id, kind: "user", name: u.username, avatarSrc: u.profilePicture,
        }]);
    };

    const handleSend = async () => {
        if (!selected.length) return;
        setSending(true);
        try {
            for (const r of selected) {
                let threadId = r.id;
                if (r.kind === "user") {
                    const res = await createOrGetDMThread(r.id);
                    threadId = res.data?.data?._id ?? res.data?.data?.threadId;
                }
                await sendMessage(threadId, { postId });
            }
            setSent(true);
            setTimeout(onClose, 1000);
        } catch {
        } finally {
            setSending(false);
        }
    };

    // When query active, show search results; otherwise show inbox
    const showSearch = query.length > 0;
    const filteredThreads = threads.filter(t => {
        const name = t.type === "dm" ? t.user?.username : t.name;
        return !query || name?.toLowerCase().includes(query.toLowerCase());
    });

    // Deduplicate search results against threads already shown
    const threadUserIds = new Set(threads.filter(t => t.user).map(t => t.user!._id));
    const uniqueSearchResults = showSearch
        ? searchResults.filter(u => !threadUserIds.has(u._id))
        : [];

    return (
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
            <div className="bg-white dark:bg-zinc-950 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl border-t sm:border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1 sm:hidden">
                    <div className="w-9 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-900">
                    <button onClick={onClose} className="text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                    <span className="font-semibold text-[15px] dark:text-white">Share</span>
                    <button
                        disabled={!selected.length || sending || sent}
                        onClick={handleSend}
                        className={`flex items-center gap-1.5 text-sm font-semibold transition-all ${
                            selected.length && !sending && !sent
                                ? "text-blue-500 active:opacity-70"
                                : "text-zinc-300 dark:text-zinc-600"
                        }`}
                    >
                        {sent
                            ? <span className="text-green-500 flex items-center gap-1"><Check size={14} />Sent</span>
                            : <><Send size={14} />{sending ? "Sending…" : `Send${selected.length > 0 ? ` (${selected.length})` : ""}`}</>
                        }
                    </button>
                </div>

                {/* Post preview */}
                {postPreview && (
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/60 dark:bg-zinc-900/40">
                        {postPreview.imageUrl ? (
                            <img src={postPreview.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                        ) : (
                            <div className="w-12 h-12 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex-shrink-0" />
                        )}
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 flex-1">
                            {postPreview.caption || "Post"}
                        </span>
                    </div>
                )}

                {/* Selected recipients row */}
                {selected.length > 0 && (
                    <div className="flex gap-3 px-4 pt-3 pb-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                        {selected.map(r => (
                            <button
                                key={r.id}
                                onClick={() => setSelected(prev => prev.filter(s => s.id !== r.id))}
                                className="flex-shrink-0 flex flex-col items-center gap-1 group"
                            >
                                <div className="relative">
                                    <Avatar src={r.avatarSrc} name={r.name} size={52} isGroup={r.isGroup} />
                                    <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-zinc-900 dark:bg-white rounded-full border-2 border-white dark:border-zinc-950 flex items-center justify-center">
                                        <X size={9} className="text-white dark:text-zinc-900" />
                                    </div>
                                </div>
                                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-[52px] truncate">{r.name}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Search */}
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-zinc-100 dark:border-zinc-900">
                    <Search size={15} className="text-zinc-400 flex-shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        className="flex-1 text-[15px] outline-none bg-transparent dark:text-white placeholder-zinc-400"
                    />
                    {(searching || loadingThreads) && (
                        <div className="w-4 h-4 border-2 border-zinc-300 dark:border-zinc-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    )}
                    {query && !searching && (
                        <button onClick={() => setQuery("")} className="text-zinc-400 flex-shrink-0"><X size={14} /></button>
                    )}
                </div>

                {/* List */}
                <div className="overflow-y-auto max-h-72">
                    {!showSearch && (
                        <div className="px-4 pt-3 pb-1">
                            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Suggested</span>
                        </div>
                    )}

                    {/* Extra search results (users not in inbox) */}
                    {uniqueSearchResults.map(user => {
                        const sel = isSelected(user._id);
                        return (
                            <button key={user._id} onClick={() => toggleUser(user)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/80 transition-colors">
                                <Avatar src={user.profilePicture} name={user.username} size={48} />
                                <div className="flex-1 text-left min-w-0">
                                    <div className="text-[15px] font-medium dark:text-white truncate">{user.username}</div>
                                    {user.name && user.name !== user.username && (
                                        <div className="text-xs text-zinc-400 truncate">{user.name}</div>
                                    )}
                                </div>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                    sel ? "bg-blue-500 border-blue-500" : "border-zinc-300 dark:border-zinc-600"
                                }`}>
                                    {sel && <Check size={12} className="text-white" strokeWidth={3} />}
                                </div>
                            </button>
                        );
                    })}

                    {/* Inbox threads (always shown, filtered if searching) */}
                    {filteredThreads.map(thread => {
                        const sel = isSelected(thread.threadId);
                        const name = thread.type === "dm" ? thread.user?.username ?? "Unknown" : thread.name ?? "Group";
                        return (
                            <button key={thread.threadId} onClick={() => toggleThread(thread)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/80 transition-colors">
                                <Avatar
                                    src={thread.type === "dm" ? thread.user?.profilePicture : thread.avatar}
                                    name={name}
                                    size={48}
                                    isGroup={thread.type === "group"}
                                />
                                <span className="flex-1 text-[15px] font-medium dark:text-white text-left truncate">{name}</span>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                    sel ? "bg-blue-500 border-blue-500" : "border-zinc-300 dark:border-zinc-600"
                                }`}>
                                    {sel && <Check size={12} className="text-white" strokeWidth={3} />}
                                </div>
                            </button>
                        );
                    })}

                    {!loadingThreads && filteredThreads.length === 0 && uniqueSearchResults.length === 0 && (
                        <div className="text-center py-10 text-sm text-zinc-400">No results</div>
                    )}
                </div>
            </div>
        </div>
    );
}