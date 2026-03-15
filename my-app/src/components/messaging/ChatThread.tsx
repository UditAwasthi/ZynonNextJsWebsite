"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ArrowLeft, Phone, Video, Info, Image as ImageIcon, Send, X, Users, Search, ChevronUp, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useChat, type Message } from "../../hooks/useChat";
import MessageBubble from "./MessageBubble";
import ForwardModal from "./ForwardModal";
import AddMemberModal from "./AddMemberModal";
import {
    getMessages, sendMessage, markMessagesSeen, addReaction,
    forwardMessage, pinMessage, deleteMessage, editMessage, uploadChatMedia
} from "../../lib/api/chatApi";
import { Avatar } from "./Avatar";
import type { Thread } from "./InboxList";

interface Props {
    thread: Thread;
    onBack: () => void;
    currentUserId: string;
    token: string;
}

// We need to look up profile pictures for group participants
// They come through from senderId once populated — cache them locally
const profilePicCache: Record<string, string> = {};

// ── Helpers ───────────────────────────────────────────────────────────────────
function isNearBottom(el: HTMLDivElement, threshold = 120): boolean {
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
}

export default function ChatThread({ thread, onBack, currentUserId, token }: Props) {
    const { messages, setMessages, isTyping, emitTypingStart, emitTypingStop } =
        useChat(thread.threadId, token);

    const [input, setInput] = useState("");
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    const [editingMsg, setEditingMsg] = useState<Message | null>(null);
    const [forwardMsg, setForwardMsg] = useState<Message | null>(null);
    const [showAddMember, setShowAddMember] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [cursor, setCursor] = useState<string | undefined>();
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // ── Search state ─────────────────────────────────────────────────────────
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Message[]>([]);
    const [searchIndex, setSearchIndex] = useState(0);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const msgRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prevScrollHeight = useRef(0);

    const isGroup = thread.type === "group";
    const isAdmin = false; // derive from participants when available

    useEffect(() => {
        prevMsgCount.current = 0; // reset for new thread
        loadHistory();
    }, [thread.threadId]);

    // Scroll to bottom on initial load (instant) and when I send a message (smooth)
    const prevMsgCount = useRef(0);
    useEffect(() => {
        if (loadingHistory) return;
        const newCount = messages.length;
        const lastMsg = messages[messages.length - 1];
        const isMine = lastMsg?.senderId._id === currentUserId;

        if (prevMsgCount.current === 0) {
            // Initial load — jump instantly
            bottomRef.current?.scrollIntoView({ behavior: "instant" as ScrollBehavior });
        } else if (isMine || (scrollRef.current && isNearBottom(scrollRef.current))) {
            // New message and user is near bottom — smooth scroll
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
        prevMsgCount.current = newCount;
    }, [messages.length, loadingHistory]);

    // When loading more (older), preserve scroll position
    useEffect(() => {
        if (loadingMore && scrollRef.current) {
            prevScrollHeight.current = scrollRef.current.scrollHeight;
        }
    }, [loadingMore]);

    // Mark messages as seen
    useEffect(() => {
        const ids = messages
            .filter(m => m.senderId._id !== currentUserId && !m.seenBy.includes(currentUserId))
            .map(m => m._id);
        if (ids.length > 0) {
            markMessagesSeen(thread.threadId, ids).catch(() => { });
        }
    }, [messages, currentUserId, thread.threadId]);

    // Build profile pic cache — senderId only has { _id, username }, no profilePicture.
    // Fetch each unique sender's pic once and cache it.
    useEffect(() => {
        const unseen = messages
            .filter(m => m.senderId._id && !profilePicCache[m.senderId._id])
            .map(m => ({ id: m.senderId._id, username: m.senderId.username }));

        const unique = [...new Map(unseen.map(u => [u.id, u])).values()];
        if (!unique.length) return;

        unique.forEach(async ({ id, username }) => {
            try {
                const res = await import("../../lib/api/api").then(m => m.default.get(`/profile/${username}`));
                const pic = res.data?.data?.profilePicture ?? res.data?.data?.profile?.profilePicture;
                if (pic) profilePicCache[id] = pic;
            } catch { }
        });
    }, [messages]);

    const loadHistory = async () => {
        setLoadingHistory(true);
        try {
            const res = await getMessages(thread.threadId);
            const msgs: Message[] = res.data?.data ?? [];
            setMessages(msgs);
            if (msgs.length > 0) {
                setCursor(msgs[0].createdAt);
                setHasMore(msgs.length === 30);
            } else {
                setHasMore(false);
            }
        } catch {
        } finally {
            setLoadingHistory(false);
        }
    };

    const loadMore = async () => {
        if (!hasMore || loadingMore || !cursor) return;
        setLoadingMore(true);
        try {
            const res = await getMessages(thread.threadId, cursor);
            const older: Message[] = res.data?.data ?? [];
            if (older.length === 0) { setHasMore(false); return; }
            setMessages(prev => {
                const existingIds = new Set(prev.map(m => m._id));
                const fresh = older.filter(m => !existingIds.has(m._id));
                return [...fresh, ...prev];
            });
            setCursor(older[0].createdAt);
            setHasMore(older.length === 30);

            // Restore scroll position after DOM update
            requestAnimationFrame(() => {
                if (scrollRef.current) {
                    const diff = scrollRef.current.scrollHeight - prevScrollHeight.current;
                    scrollRef.current.scrollTop += diff;
                }
            });
        } catch {
        } finally {
            setLoadingMore(false);
        }
    };

    const handleScroll = () => {
        if (scrollRef.current && scrollRef.current.scrollTop < 100) {
            loadMore();
        }
    };

    const handleSend = async () => {
        const text = input.trim();
        if (!text && !editingMsg) return;

        if (editingMsg) {
            setEditingMsg(null);
            setInput("");
            await editMessage(editingMsg._id, text).catch(() => { });
            return;
        }

        const currentReply = replyTo;
        setInput("");
        setReplyTo(null);
        if (typingTimer.current !== null) clearTimeout(typingTimer.current ?? undefined);
        emitTypingStop();

        try {
            await sendMessage(thread.threadId, {
                content: text,
                replyTo: currentReply?._id,
            });
        } catch { }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        emitTypingStart();
        if (typingTimer.current !== null) clearTimeout(typingTimer.current ?? undefined);
        typingTimer.current = setTimeout(() => emitTypingStop(), 2000);
        // Auto-resize
        const el = e.target;
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 120) + "px";
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const { url, type, meta } = await uploadChatMedia(file, setUploadProgress);
            await sendMessage(thread.threadId, { attachments: [{ url, type, meta }] });
        } catch {
        } finally {
            setUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleForwardSend = async (targetThreadId: string) => {
        if (!forwardMsg) return;
        await forwardMessage(String(forwardMsg._id), targetThreadId).catch(() => { });
    };

    const startEdit = (msg: Message) => {
        setEditingMsg(msg);
        setInput(msg.content || "");
        setTimeout(() => {
            inputRef.current?.focus();
            const el = inputRef.current;
            if (el) {
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 120) + "px";
            }
        }, 0);
    };

    const cancelEditOrReply = () => {
        setEditingMsg(null);
        setReplyTo(null);
        setInput("");
        if (inputRef.current) inputRef.current.style.height = "auto";
    };

    // ── Search handlers ───────────────────────────────────────────────────────
    const openSearch = () => {
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
    };

    const closeSearch = () => {
        setShowSearch(false);
        setSearchQuery("");
        setSearchResults([]);
        setSearchIndex(0);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        setSearchQuery(q);
        setSearchIndex(0);
        if (!q.trim()) { setSearchResults([]); return; }
        // Search client-side on already-loaded messages — no API call needed
        const q_lower = q.toLowerCase();
        const matches = messages.filter(m =>
            m.content?.toLowerCase().includes(q_lower)
        );
        setSearchResults(matches);
        // Auto-scroll to first match
        if (matches.length > 0) {
            setTimeout(() => scrollToMessage(matches[0]._id), 50);
        }
    };

    const scrollToMessage = useCallback((msgId: string) => {
        const el = msgRefs.current[msgId];
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            // Flash highlight
            el.classList.add("search-highlight");
            setTimeout(() => el.classList.remove("search-highlight"), 1500);
        }
    }, []);

    const goToResult = useCallback((idx: number) => {
        if (!searchResults.length) return;
        const clamped = Math.max(0, Math.min(idx, searchResults.length - 1));
        setSearchIndex(clamped);
        scrollToMessage(searchResults[clamped]._id);
    }, [searchResults, scrollToMessage]);

    // Group messages by date for dividers
    const grouped = messages.reduce<{ date: string; msgs: Message[] }[]>((acc, msg) => {
        const d = new Date(msg.createdAt).toDateString();
        const last = acc[acc.length - 1];
        if (last?.date === d) last.msgs.push(msg);
        else acc.push({ date: d, msgs: [msg] });
        return acc;
    }, []);

    const formatDate = (ds: string) => {
        const d = new Date(ds);
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (d.toDateString() === now.toDateString()) return "Today";
        if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
        return d.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
    };

    const headerName = isGroup ? thread.name ?? "Group" : thread.user?.username ?? "User";
    const headerAvatar = isGroup ? thread.avatar : thread.user?.profilePicture;




    return (
        <div className="flex flex-col h-full bg-[#f8f9fb] dark:bg-[#0a0a0c] transition-colors duration-700">
            <style>{`
                @keyframes searchSlideDown {
                    from { opacity: 0; transform: translateY(-8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .search-bar-in { animation: searchSlideDown 0.2s ease both; }
                @keyframes searchHighlight {
                    0%   { background: rgba(59,130,246,0.25); }
                    100% { background: transparent; }
                }
                .search-highlight { animation: searchHighlight 1.5s ease forwards; border-radius: 12px; }
            `}</style>

            {/* Floating Glass Header */}
            <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/70 dark:bg-[#121215]/80 border-b border-zinc-200/50 dark:border-zinc-800/50 shadow-sm transition-all">
                <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="md:hidden group p-2 rounded-full hover:bg-white dark:hover:bg-zinc-800 shadow-none hover:shadow-md transition-all active:scale-90"
                        >
                            <ArrowLeft size={22} className="text-zinc-600 dark:text-zinc-300 group-hover:-translate-x-0.5 transition-transform" />
                        </button>

                        <div className="relative group cursor-pointer">
                            <Avatar
                                src={headerAvatar}
                                name={headerName}
                                size={44}
                                isGroup={isGroup}
                                className="rounded-2xl shadow-sm group-hover:shadow-md transition-shadow"
                            />
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-[#121215] rounded-full" />
                        </div>

                        <div className="flex flex-col">
                            {/* Clickable username for DM threads */}
                            {!isGroup && thread.user?.username ? (
                                <Link
                                    href={`/profile/${thread.user.username}`}
                                    className="font-bold text-[17px] text-zinc-900 dark:text-zinc-100 tracking-tight leading-none hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                                >
                                    {headerName}
                                </Link>
                            ) : (
                                <h2 className="font-bold text-[17px] text-zinc-900 dark:text-zinc-100 tracking-tight leading-none">
                                    {headerName}
                                </h2>
                            )}
                            <div className="flex items-center gap-1.5 mt-1">
                                {isTyping ? (
                                    <div className="flex items-center gap-1">
                                        <span className="flex gap-1">
                                            {[0, 150, 300].map(d => (
                                                <span key={d} className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: `${d}ms` }} />
                                            ))}
                                        </span>
                                        <span className="text-[11px] font-bold text-blue-500 uppercase tracking-widest italic">Typing</span>
                                    </div>
                                ) : (
                                    <span className="text-[12px] font-medium text-zinc-400">
                                        {isGroup ? "Community" : "Active now"}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Search toggle */}
                        <button
                            onClick={showSearch ? closeSearch : openSearch}
                            className={`p-2.5 rounded-xl transition-all active:scale-95 ${
                                showSearch
                                    ? "bg-blue-500 text-white"
                                    : "text-zinc-500 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 hover:text-blue-500"
                            }`}
                        >
                            <Search size={20} />
                        </button>

                        {isGroup && (
                            <button
                                onClick={() => setShowAddMember(true)}
                                className="p-2.5 rounded-xl text-zinc-500 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 hover:text-blue-500 transition-all active:scale-95"
                            >
                                <Users size={20} />
                            </button>
                        )}
                        <button className="p-2.5 rounded-xl text-zinc-500 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 transition-all active:scale-95">
                            <Info size={20} />
                        </button>
                    </div>
                </div>

                {/* Search bar — slides down when open */}
                {showSearch && (
                    <div className="search-bar-in px-4 pb-3 flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 rounded-2xl px-4 py-2.5 border border-zinc-200/50 dark:border-zinc-800">
                            <Search size={15} className="text-zinc-400 shrink-0" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                onKeyDown={e => {
                                    if (e.key === "Enter") goToResult(searchIndex + 1);
                                    if (e.key === "Escape") closeSearch();
                                }}
                                placeholder="Search in conversation…"
                                className="flex-1 bg-transparent text-[14px] outline-none dark:text-white placeholder-zinc-400"
                            />
                            {searchQuery && (
                                <span className="text-[11px] font-bold text-zinc-400 shrink-0">
                                    {searchResults.length > 0 ? `${searchIndex + 1}/${searchResults.length}` : "0"}
                                </span>
                            )}
                        </div>

                        {/* Prev / Next */}
                        <button
                            onClick={() => goToResult(searchIndex - 1)}
                            disabled={!searchResults.length || searchIndex === 0}
                            className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-500 disabled:opacity-30 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all active:scale-90"
                        >
                            <ChevronUp size={16} />
                        </button>
                        <button
                            onClick={() => goToResult(searchIndex + 1)}
                            disabled={!searchResults.length || searchIndex === searchResults.length - 1}
                            className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-500 disabled:opacity-30 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all active:scale-90"
                        >
                            <ChevronDown size={16} />
                        </button>
                    </div>
                )}
            </header>

            {/* Messages Stage */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto overscroll-contain px-4 lg:px-8 space-y-6 py-6 scroll-smooth"
            >
                {loadingHistory ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                        <div className="w-8 h-8 border-[3px] border-zinc-200 dark:border-zinc-800 border-t-blue-500 rounded-full animate-spin" />
                        <p className="text-sm font-medium text-zinc-400 animate-pulse">Decrypting messages...</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-20 animate-in fade-in zoom-in duration-700">
                        <div className="relative mb-6">
                            <Avatar src={headerAvatar} name={headerName} size={90} isGroup={isGroup} className="rounded-[32px] shadow-2xl" />
                            <div className="absolute -bottom-2 -right-2 bg-white dark:bg-zinc-900 p-2 rounded-full shadow-lg">👋</div>
                        </div>
                        <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-200">Your conversation starts here</h3>
                        <p className="text-zinc-400 text-sm mt-2 max-w-[200px]">Send a message to break the ice with {headerName}</p>
                    </div>
                ) : (
                    grouped.map(({ date, msgs }) => (
                        <div key={date} className="space-y-4">
                            <div className="sticky top-2 z-10 flex justify-center py-4">
                                <span className="px-4 py-1.5 rounded-full bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-tighter border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
                                    {formatDate(date)}
                                </span>
                            </div>

                            <div className="space-y-1">
                                {msgs.map((msg, i) => {
                                    const isMine = msg.senderId._id === currentUserId;
                                    const prevMsg = msgs[i - 1];
                                    const sameAsPrev = prevMsg?.senderId._id === msg.senderId._id;

                                    return (
                                        <div
                                            key={msg._id}
                                            ref={el => { msgRefs.current[msg._id] = el; }}
                                            className={`${!sameAsPrev && i > 0 ? "mt-6" : "mt-0.5"} transition-all duration-500 animate-in slide-in-from-bottom-2`}
                                        >
                                            <MessageBubble
                                                message={msg}
                                                isMine={isMine}
                                                currentUserId={currentUserId}
                                                isAdmin={isAdmin}
                                                senderProfilePicture={profilePicCache[msg.senderId._id]}
                                                showSenderInfo={!isMine && !sameAsPrev}
                                                // Pass these handlers to resolve the TS error:
                                                onReply={setReplyTo}
                                                onEdit={startEdit}
                                                onDelete={id => deleteMessage(id).catch(() => { })}
                                                onReact={(id, e) => addReaction(id, e).catch(() => { })}
                                                onForward={setForwardMsg}
                                                onPin={id => pinMessage(id).catch(() => { })}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
                <div ref={bottomRef} className="h-4" />
            </div>

            {/* Input Dock */}
            <div className="px-4 pb-6 pt-2 bg-gradient-to-t from-[#f8f9fb] via-[#f8f9fb] dark:from-[#0a0a0c] dark:via-[#0a0a0c] to-transparent">
                <div className="max-w-4xl mx-auto">

                    {/* Active Interaction Banner */}
                    {(replyTo || editingMsg) && (
                        <div className="flex items-center gap-3 mx-2 mb-3 px-4 py-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-[20px] border border-zinc-200/50 dark:border-zinc-800/50 animate-in slide-in-from-bottom-4 duration-300 shadow-xl">
                            <div className="w-1 h-8 bg-blue-500 rounded-full" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1">
                                    {editingMsg ? "Editing" : "Replying to " + replyTo?.senderId.username}
                                </p>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate italic">
                                    "{editingMsg?.content || replyTo?.content || "Attachment"}"
                                </p>
                            </div>
                            <button onClick={cancelEditOrReply} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                                <X size={16} className="text-zinc-400" />
                            </button>
                        </div>
                    )}

                    {/* Main Input Bar */}
                    <div className="relative flex items-end gap-2 p-2 bg-white dark:bg-[#121215] rounded-[30px] border border-zinc-200/50 dark:border-zinc-800/50 shadow-[0_10px_40px_rgba(0,0,0,0.04)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.2)]">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-500 transition-all active:scale-90"
                        >
                            <ImageIcon size={22} className="opacity-80 group-hover:opacity-100" />
                        </button>

                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Write your message..."
                            className="flex-1 bg-transparent py-3 px-2 text-[15px] dark:text-white outline-none placeholder-zinc-400 leading-relaxed resize-none overflow-hidden"
                            style={{ height: "46px", maxHeight: "180px" }}
                        />

                        <button
                            onClick={handleSend}
                            disabled={!input.trim()}
                            className={`w-11 h-11 flex items-center justify-center rounded-full transition-all duration-300 ${input.trim()
                                    ? "bg-blue-600 text-white shadow-[0_4px_15px_rgba(37,99,235,0.4)] hover:scale-105 active:scale-95"
                                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                                }`}
                        >
                            <Send size={18} className={input.trim() ? "translate-x-0.5 -translate-y-0.5" : ""} />
                        </button>
                    </div>

                    {uploading && (
                        <div className="mt-3 px-4 animate-in fade-in duration-500">
                            <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-500 ease-out shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {forwardMsg && (
                <ForwardModal
                    onClose={() => setForwardMsg(null)}
                    onForward={async (tid) => { await handleForwardSend(tid); }}
                />
            )}

            {showAddMember && (
                <AddMemberModal
                    threadId={thread.threadId}
                    onClose={() => setShowAddMember(false)}
                />
            )}
        </div>
    );
}