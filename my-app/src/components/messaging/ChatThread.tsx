"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
    ArrowLeft, Info, Image as ImageIcon, Send, X,
    Users, Search, ChevronUp, ChevronDown, Pin
} from "lucide-react";
import Link from "next/link";
import { getSocket } from "../../lib/socket";
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

// Profile picture cache — keyed by userId, populated lazily
const profilePicCache: Record<string, string> = {};

function isNearBottom(el: HTMLDivElement, threshold = 150): boolean {
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
}

export default function ChatThread({ thread, onBack, currentUserId, token }: Props) {
    const {
        messages, setMessages,
        isTyping, typingUsers,
        emitTypingStart, emitTypingStop,
        emitDelivered, emitHeartbeat
    } = useChat(thread.threadId, token);

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
    const [isOnline, setIsOnline] = useState(false);

    // ── Search state ──────────────────────────────────────────────────────────
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
    const prevMsgCount = useRef(0);
    // Throttle scroll-to-load so it doesn't fire 20× per scroll
    const loadMoreThrottleRef = useRef(false);

    const isGroup = thread.type === "group";

    // Most recently pinned non-deleted message
    const pinnedMessage = messages
        .filter(m => m.pinnedBy && !m.isDeleted)
        .at(-1) ?? null;

    // ── Derive isAdmin from thread participants ────────────────────────────────
    // The Thread type comes from the inbox and carries participants when the
    // server populates them. Fall back to false if not present.
    const isAdmin = (thread as any).participants?.some(
        (p: any) => p.userId?._id === currentUserId && ["admin", "owner"].includes(p.role)
    ) ?? false;

    // ── Heartbeat: keep Redis online key alive ────────────────────────────────
    useEffect(() => {
        const interval = setInterval(emitHeartbeat, 25_000);
        return () => clearInterval(interval);
    }, [emitHeartbeat]);

    // ── Online presence for DM header ─────────────────────────────────────────
    useEffect(() => {
        if (isGroup || !thread.user) return;
        const socket = getSocket(token);
        const otherId = thread.user._id;

        const onOnline  = ({ userId }: { userId: string }) => { if (userId === otherId) setIsOnline(true);  };
        const onOffline = ({ userId }: { userId: string }) => { if (userId === otherId) setIsOnline(false); };

        socket.on("user_online",  onOnline);
        socket.on("user_offline", onOffline);
        return () => {
            socket.off("user_online",  onOnline);
            socket.off("user_offline", onOffline);
        };
    }, [token, isGroup, thread.user]);

    // ── Load history when thread changes ─────────────────────────────────────
    useEffect(() => {
        prevMsgCount.current = 0;
        setIsOnline(false);
        loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [thread.threadId]);

    // ── Auto-scroll ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (loadingHistory) return;
        const newCount = messages.length;
        const lastMsg = messages[messages.length - 1];
        const isMine = lastMsg?.senderId._id === currentUserId;

        if (prevMsgCount.current === 0) {
            bottomRef.current?.scrollIntoView({ behavior: "instant" as ScrollBehavior });
        } else if (isMine || (scrollRef.current && isNearBottom(scrollRef.current))) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
        prevMsgCount.current = newCount;
    }, [messages.length, loadingHistory, currentUserId]);

    // Preserve scroll position when loading older messages
    useEffect(() => {
        if (loadingMore && scrollRef.current) {
            prevScrollHeight.current = scrollRef.current.scrollHeight;
        }
    }, [loadingMore]);

    // ── Mark messages as seen + emit delivered ────────────────────────────────
    useEffect(() => {
        if (!messages.length) return;

        const unseenIds = messages
            .filter(m => m.senderId._id !== currentUserId && !m.seenBy.includes(currentUserId))
            .map(m => m._id);

        if (unseenIds.length > 0) {
            markMessagesSeen(thread.threadId, unseenIds).catch(() => { });
        }

        // Emit delivered for messages not yet marked delivered to us
        const undeliveredIds = messages
            .filter(m => m.senderId._id !== currentUserId && !m.deliveredTo.includes(currentUserId))
            .map(m => m._id);

        undeliveredIds.forEach(id => emitDelivered(id));
    }, [messages, currentUserId, thread.threadId, emitDelivered]);

    // ── Profile picture cache ─────────────────────────────────────────────────
    useEffect(() => {
        const unseen = messages
            .filter(m => m.senderId._id && !profilePicCache[m.senderId._id])
            .map(m => ({ id: m.senderId._id, username: m.senderId.username }));

        const unique = [...new Map(unseen.map(u => [u.id, u])).values()];
        if (!unique.length) return;

        // Use Promise.allSettled so one failure doesn't block the rest
        Promise.allSettled(
            unique.map(async ({ id, username }) => {
                try {
                    const res = await import("../../lib/api/api")
                        .then(m => m.default.get(`/profile/${username}`));
                    const pic = res.data?.data?.profilePicture ?? res.data?.data?.profile?.profilePicture;
                    if (pic) profilePicCache[id] = pic;
                } catch { }
            })
        );
    }, [messages]);

    // ── Typing indicator label ────────────────────────────────────────────────
    const typingLabel = (() => {
        const ids = Object.keys(typingUsers);
        if (!ids.length) return null;
        if (!isGroup) return "Typing…";
        if (ids.length === 1) return `${messages.find(m => m.senderId._id === ids[0])?.senderId.username ?? "Someone"} is typing…`;
        if (ids.length === 2) return `${ids.length} people are typing…`;
        return "Several people are typing…";
    })();

    // ── Data fetching ─────────────────────────────────────────────────────────
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

    const loadMore = useCallback(async () => {
        if (!hasMore || loadingMore || !cursor || loadMoreThrottleRef.current) return;
        loadMoreThrottleRef.current = true;
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

            requestAnimationFrame(() => {
                if (scrollRef.current) {
                    const diff = scrollRef.current.scrollHeight - prevScrollHeight.current;
                    scrollRef.current.scrollTop += diff;
                }
            });
        } catch {
        } finally {
            setLoadingMore(false);
            // Re-enable after 500ms to prevent rapid-fire triggers
            setTimeout(() => { loadMoreThrottleRef.current = false; }, 500);
        }
    }, [hasMore, loadingMore, cursor, thread.threadId, setMessages]);

    const handleScroll = useCallback(() => {
        if (scrollRef.current && scrollRef.current.scrollTop < 150) {
            loadMore();
        }
    }, [loadMore]);

    // ── Message actions ───────────────────────────────────────────────────────

    const handleSend = async () => {
        const text = input.trim();
        // Allow send when editing even if text matches original; require text otherwise
        if (!text && !editingMsg) return;

        if (editingMsg) {
            const prev = editingMsg;
            // Optimistic update
            setMessages(msgs => msgs.map(m =>
                m._id === prev._id ? { ...m, content: text, isEdited: true } : m
            ));
            setEditingMsg(null);
            setInput("");
            await editMessage(prev._id, text).catch(() => {
                // Revert on failure
                setMessages(msgs => msgs.map(m =>
                    m._id === prev._id ? { ...m, content: prev.content, isEdited: prev.isEdited } : m
                ));
            });
            return;
        }

        const currentReply = replyTo;
        setInput("");
        setReplyTo(null);
        if (typingTimer.current) clearTimeout(typingTimer.current);
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
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => emitTypingStop(), 2000);
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

    const handleDelete = useCallback(async (messageId: string) => {
        // Optimistic: mark as deleted immediately
        setMessages(prev => prev.map(m =>
            m._id === messageId
                ? { ...m, isDeleted: true, content: undefined, attachments: [], reactions: [] }
                : m
        ));
        await deleteMessage(messageId).catch(() => {
            // Revert on failure — we don't have the original so just reload
            loadHistory();
        });
    }, [setMessages]);

    const handlePin = useCallback(async (messageId: string) => {
        await pinMessage(messageId).catch(() => { });
        // Socket will emit message_pinned back to update local state
    }, []);

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

    // ── Search ────────────────────────────────────────────────────────────────
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
        const q_lower = q.toLowerCase();
        const matches = messages.filter(m =>
            !m.isDeleted && m.content?.toLowerCase().includes(q_lower)
        );
        setSearchResults(matches);
        if (matches.length > 0) setTimeout(() => scrollToMessage(matches[0]._id), 50);
    };

    const scrollToMessage = useCallback((msgId: string) => {
        const el = msgRefs.current[msgId];
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
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

    // ── Group messages by date ────────────────────────────────────────────────
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
        <div
            className="relative flex flex-col w-full bg-white/30 dark:bg-[#050505]/40 backdrop-blur-3xl transition-colors duration-700 overflow-hidden
                        h-[calc(100dvh-56px-64px-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))]
                        md:h-full"
        >
            {/* Ambient Glass Depth (Material You style blobs) */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-[100px] pointer-events-none z-[-1]" />
            <div className="absolute bottom-[20%] right-[-10%] w-80 h-80 bg-purple-500/10 dark:bg-purple-600/10 rounded-full blur-[120px] pointer-events-none z-[-1]" />

            <style>{`
                @keyframes searchSlideDown {
                    from { opacity: 0; transform: translateY(-12px) scale(0.98); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                .search-bar-in { animation: searchSlideDown 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
                
                @keyframes messageSlideUp {
                    from { opacity: 0; transform: translateY(16px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .msg-enter { animation: messageSlideUp 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both; }

                /* Android 14+ Pill Scrollbar */
                .scrollbar-aesthetic::-webkit-scrollbar { width: 4px; }
                .scrollbar-aesthetic::-webkit-scrollbar-track { background: transparent; }
                .scrollbar-aesthetic::-webkit-scrollbar-thumb { 
                    background: rgba(156, 163, 175, 0.3); 
                    border-radius: 10px; 
                }
                .dark .scrollbar-aesthetic::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); }
            `}</style>

            {/* Header - Glassmorphic */}
            <header className="sticky top-0 z-30 backdrop-blur-2xl bg-white/40 dark:bg-[#0a0a0c]/40 border-b border-white/30 dark:border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.2)] transition-all">
                <div className="px-3 py-3 md:py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 md:gap-4">
                        <button
                            onClick={onBack}
                            className="md:hidden group p-2.5 rounded-full bg-white/20 dark:bg-white/5 hover:bg-white/50 dark:hover:bg-white/10 transition-all active:scale-90"
                        >
                            <ArrowLeft size={22} className="text-zinc-700 dark:text-zinc-200 group-hover:-translate-x-0.5 transition-transform" />
                        </button>

                        <div className="relative group cursor-pointer">
                            <Avatar
                                src={headerAvatar}
                                name={headerName}
                                size={46}
                                isGroup={isGroup}
                                className="rounded-[20px] shadow-sm ring-1 ring-white/40 dark:ring-white/10 group-hover:scale-105 transition-all duration-300"
                            />
                            {/* Seamless Android-style online dot */}
                            {!isGroup && (
                                <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-[3px] border-[#f8f9fb] dark:border-[#0a0a0c] rounded-full transition-colors ${isOnline ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]" : "bg-zinc-300 dark:bg-zinc-600"}`} />
                            )}
                        </div>

                        <div className="flex flex-col justify-center">
                            {!isGroup && thread.user?.username ? (
                                <Link
                                    href={`/profile/${thread.user.username}`}
                                    className="font-bold text-[18px] text-zinc-900 dark:text-zinc-50 tracking-tight leading-tight hover:text-blue-500 dark:hover:text-blue-400 transition-colors drop-shadow-sm"
                                >
                                    {headerName}
                                </Link>
                            ) : (
                                <h2 className="font-bold text-[18px] text-zinc-900 dark:text-zinc-50 tracking-tight leading-tight drop-shadow-sm">
                                    {headerName}
                                </h2>
                            )}
                            
                            <div className="flex items-center gap-1.5 h-4 mt-0.5">
                                {isTyping ? (
                                    <div className="flex items-center gap-1.5 bg-blue-500/10 dark:bg-blue-500/20 px-2 py-0.5 rounded-full">
                                        <span className="flex gap-0.5">
                                            {[0, 150, 300].map(d => (
                                                <span key={d} className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                                            ))}
                                        </span>
                                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                                            {typingLabel}
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400 tracking-wide">
                                        {isGroup ? "Group circle" : isOnline ? "Active right now" : "Offline"}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={showSearch ? closeSearch : openSearch}
                            className={`p-3 rounded-2xl transition-all duration-300 active:scale-90 ${
                                showSearch
                                    ? "bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                                    : "bg-white/30 dark:bg-white/5 text-zinc-600 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-white/10"
                            }`}
                        >
                            <Search size={20} />
                        </button>

                        {isGroup && (
                            <button
                                onClick={() => setShowAddMember(true)}
                                className="p-3 rounded-2xl bg-white/30 dark:bg-white/5 text-zinc-600 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-white/10 transition-all active:scale-90"
                            >
                                <Users size={20} />
                            </button>
                        )}
                        <button className="hidden md:flex p-3 rounded-2xl bg-white/30 dark:bg-white/5 text-zinc-600 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-white/10 transition-all active:scale-90">
                            <Info size={20} />
                        </button>
                    </div>
                </div>

                {/* Search bar - Floating Dropdown */}
                {showSearch && (
                    <div className="search-bar-in px-4 pb-4 flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-3 bg-white/50 dark:bg-[#121215]/80 backdrop-blur-md rounded-[20px] px-4 py-3 ring-1 ring-white/50 dark:ring-white/10 shadow-inner">
                            <Search size={16} className="text-zinc-400 shrink-0" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                onKeyDown={e => {
                                    if (e.key === "Enter") goToResult(searchIndex + 1);
                                    if (e.key === "Escape") closeSearch();
                                }}
                                placeholder="Search in circle…"
                                className="flex-1 bg-transparent text-[15px] font-medium outline-none text-zinc-900 dark:text-white placeholder-zinc-400/80"
                            />
                            {searchQuery && (
                                <span className="text-[11px] font-bold text-zinc-400 bg-white/40 dark:bg-white/10 px-2 py-0.5 rounded-full shrink-0">
                                    {searchResults.length > 0 ? `${searchIndex + 1}/${searchResults.length}` : "0"}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-1.5">
                            <button
                                onClick={() => goToResult(searchIndex - 1)}
                                disabled={!searchResults.length || searchIndex === 0}
                                className="p-3 rounded-[18px] bg-white/40 dark:bg-white/10 text-zinc-700 dark:text-zinc-200 disabled:opacity-30 hover:bg-white/70 dark:hover:bg-white/20 transition-all active:scale-90"
                            >
                                <ChevronUp size={18} />
                            </button>
                            <button
                                onClick={() => goToResult(searchIndex + 1)}
                                disabled={!searchResults.length || searchIndex === searchResults.length - 1}
                                className="p-3 rounded-[18px] bg-white/40 dark:bg-white/10 text-zinc-700 dark:text-zinc-200 disabled:opacity-30 hover:bg-white/70 dark:hover:bg-white/20 transition-all active:scale-90"
                            >
                                <ChevronDown size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </header>

            {/* ── Pinned Message Banner ── */}
            {pinnedMessage && (
                <button
                    onClick={() => scrollToMessage(pinnedMessage._id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border-b border-white/30 dark:border-white/5 hover:bg-white/80 dark:hover:bg-zinc-800/60 transition-all duration-200 z-20 group"
                >
                    {/* Left accent bar */}
                    <div className="w-0.5 h-8 bg-blue-500 rounded-full shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />

                    <Pin size={13} className="text-blue-500 shrink-0 rotate-45" />

                    <div className="flex-1 min-w-0 text-left">
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none mb-0.5">
                            Pinned Message
                        </p>
                        <p className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 truncate leading-snug">
                            {pinnedMessage.type === "post"
                                ? "📎 Shared a post"
                                : pinnedMessage.attachments?.length
                                    ? "📎 Attachment"
                                    : pinnedMessage.content || "Message"
                            }
                        </p>
                    </div>

                    <X
                        size={15}
                        className="text-zinc-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:text-zinc-600 dark:hover:text-zinc-200"
                        onClick={async e => {
                            e.stopPropagation();
                            await pinMessage(pinnedMessage._id).catch(() => {});
                        }}
                    />
                </button>
            )}

            {/* Messages Area */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto overscroll-contain px-3 lg:px-8 space-y-6 py-6 scrollbar-aesthetic z-10"
            >
                {loadingMore && (
                    <div className="flex justify-center py-2 animate-in fade-in zoom-in duration-300">
                        <div className="w-6 h-6 border-[3px] border-zinc-200/50 dark:border-zinc-700/50 border-t-blue-500 rounded-full animate-spin drop-shadow-md" />
                    </div>
                )}

                {loadingHistory ? (
                    <div className="flex flex-col items-center justify-center h-full gap-5">
                        <div className="relative">
                            <div className="w-10 h-10 border-[3px] border-white/20 dark:border-white/10 border-t-blue-500 rounded-full animate-spin" />
                            <div className="absolute inset-0 bg-blue-500/20 blur-md rounded-full animate-pulse" />
                        </div>
                        <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 animate-pulse tracking-wide">Syncing circle…</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-20 animate-in fade-in zoom-in slide-in-from-bottom-8 duration-1000">
                        <div className="relative mb-6 group">
                            <Avatar src={headerAvatar} name={headerName} size={100} isGroup={isGroup} className="rounded-[40px] shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)] group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute -bottom-3 -right-3 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-xl p-3 rounded-full text-xl shadow-xl ring-1 ring-white/50 dark:ring-white/10 animate-bounce delay-300">👋</div>
                        </div>
                        <h3 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 tracking-tight">The start of something new</h3>
                        <p className="text-zinc-500 dark:text-zinc-400 text-[15px] mt-2 font-medium max-w-[220px]">Say hello to {headerName} and break the ice.</p>
                    </div>
                ) : (
                    grouped.map(({ date, msgs }) => (
                        <div key={date} className="space-y-4">
                            {/* Glass Date Badge */}
                            <div className="sticky top-2 z-10 flex justify-center py-4 pointer-events-none">
                                <span className="px-5 py-2 rounded-[20px] bg-white/40 dark:bg-[#18181b]/60 backdrop-blur-xl text-[11px] font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-widest ring-1 ring-white/50 dark:ring-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
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
                                            className={`msg-enter ${!sameAsPrev && i > 0 ? "mt-6" : "mt-0.5"}`}
                                        >
                                            {/* Note: Ensure MessageBubble component inside supports soft border radius and translucent backgrounds for max effect */}
                                            <MessageBubble
                                                message={msg}
                                                isMine={isMine}
                                                currentUserId={currentUserId}
                                                isAdmin={isAdmin}
                                                senderProfilePicture={profilePicCache[msg.senderId._id]}
                                                showSenderInfo={isGroup && !isMine && !sameAsPrev}
                                                onReply={setReplyTo}
                                                onEdit={startEdit}
                                                onDelete={handleDelete}
                                                onReact={(id, emoji) => addReaction(id, emoji).catch(() => { })}
                                                onForward={setForwardMsg}
                                                onPin={handlePin}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
                <div ref={bottomRef} className="h-6" />
            </div>

            {/* Floating Glass Input Dock */}
            <div className="px-3 pb-4 md:pb-8 pt-2 relative z-20 before:absolute before:inset-0 before:bg-gradient-to-t before:from-white/60 dark:before:from-[#0a0a0c]/80 before:to-transparent before:backdrop-blur-sm before:z-[-1]">
                <div className="max-w-4xl mx-auto relative">

                    {/* Reply / Edit Stacked Glass Banner */}
                    {(replyTo || editingMsg) && (
                        <div className="absolute bottom-full left-2 right-2 mb-2 px-5 py-3.5 bg-white/60 dark:bg-[#18181b]/80 backdrop-blur-2xl rounded-[24px] ring-1 ring-white/60 dark:ring-white/10 animate-in slide-in-from-bottom-4 duration-300 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] flex items-center gap-4">
                            <div className="w-1.5 h-9 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest leading-none mb-1.5">
                                    {editingMsg ? "Editing Message" : `Replying to ${replyTo?.senderId.username}`}
                                </p>
                                <p className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 truncate">
                                    {editingMsg?.content || replyTo?.content || "Attachment"}
                                </p>
                            </div>
                            <button onClick={cancelEditOrReply} className="p-2.5 hover:bg-white/50 dark:hover:bg-white/10 rounded-full transition-colors active:scale-90">
                                <X size={18} className="text-zinc-500" />
                            </button>
                        </div>
                    )}

                    {/* Main Input Pill */}
                    <div className="relative flex items-end gap-2 p-1.5 bg-white/70 dark:bg-[#18181b]/70 backdrop-blur-2xl rounded-[32px] ring-1 ring-white/60 dark:ring-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.3)]">
                        <input
                            ref={fileInputRef as any}
                            type="file"
                            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                        <button
                            onClick={() => (fileInputRef.current as any)?.click()}
                            className="w-12 h-12 shrink-0 flex items-center justify-center rounded-full hover:bg-white/60 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 transition-all active:scale-90 mb-0.5 ml-0.5"
                        >
                            <ImageIcon size={22} className="opacity-90" />
                        </button>

                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Message…"
                            className="flex-1 bg-transparent py-3.5 px-2 text-[16px] font-medium dark:text-white outline-none placeholder-zinc-500/80 leading-relaxed resize-none overflow-hidden scrollbar-none"
                            style={{ height: "50px", maxHeight: "150px" }}
                        />

                        <button
                            onClick={handleSend}
                            disabled={!input.trim() && !editingMsg}
                            className={`w-12 h-12 shrink-0 flex items-center justify-center rounded-full transition-all duration-300 mb-0.5 mr-0.5 ${
                                (input.trim() || editingMsg)
                                    ? "bg-blue-600 dark:bg-blue-500 text-white shadow-[0_4px_20px_rgba(37,99,235,0.4)] hover:scale-105 active:scale-95"
                                    : "bg-white/40 dark:bg-white/5 text-zinc-400 cursor-not-allowed"
                            }`}
                        >
                            <Send size={20} className={(input.trim() || editingMsg) ? "translate-x-0.5 -translate-y-0.5" : ""} />
                        </button>
                    </div>

                    {/* Glowing Progress Bar */}
                    {uploading && (
                        <div className="absolute top-full left-6 right-6 mt-3 animate-in fade-in duration-500">
                            <div className="h-1.5 w-full bg-white/30 dark:bg-zinc-800/50 backdrop-blur-md rounded-full overflow-hidden ring-1 ring-white/20 dark:ring-white/5">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-500 ease-out shadow-[0_0_12px_rgba(59,130,246,0.8)] rounded-full relative"
                                    style={{ width: `${uploadProgress}%` }}
                                >
                                    <div className="absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-r from-transparent to-white/50 blur-[2px]" />
                                </div>
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