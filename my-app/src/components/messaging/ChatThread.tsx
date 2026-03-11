"use client";
import { useState, useRef, useEffect } from "react";
import { Phone, Video, MoreHorizontal, ChevronLeft, ArrowUp, Loader2, SmilePlus } from "lucide-react";
import { getMessages, sendMessage, markMessagesSeen, addReaction } from "../../lib/api/chatApi";
import { getSocket } from "../../lib/socket";

interface Message {
    _id: string;
    threadId: string;
    senderId: { _id: string; username: string };
    content: string;
    createdAt: string;
    seenBy: string[];
    deliveredTo: string[];
    reactions: { userId: string; emoji: string }[];
}

interface Thread {
    threadId: string;
    user: { _id: string; username: string } | null;
}

interface Props {
    thread: Thread;
    onBack: () => void;
    currentUserId: string;
    token: string;
}

const EMOJI_OPTIONS = ["❤️", "😂", "🔥", "👏", "😮", "😢"];

const getAvatarColor = (username: string) => {
    const colors = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#ef4444"];
    let hash = 0;
    for (let i = 0; i < username.length; i++) hash += username.charCodeAt(i);
    return colors[hash % colors.length];
};

const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function ChatThread({ thread, onBack, currentUserId, token }: Props) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [cursor, setCursor] = useState<string | undefined>();
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hoveredMsg, setHoveredMsg] = useState<string | null>(null);
    const [newMsgIds, setNewMsgIds] = useState<Set<string>>(new Set());

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Track real message IDs we already inserted via API response — skip them in socket handler
    const ownedMessageIds = useRef<Set<string>>(new Set());
    const username = thread.user?.username || "Unknown";

    // ── Load initial messages ─────────────────────────────────────────────────
    useEffect(() => {
        const fetchMessages = async () => {
            try {
                setLoading(true);
                setMessages([]);
                const res = await getMessages(thread.threadId);
                const msgs: Message[] = res.data?.data || [];
                setMessages(msgs);
                if (msgs.length > 0) setCursor(msgs[0].createdAt);
                setHasMore(msgs.length === 30);
            } catch (err) {
                console.error("Failed to load messages", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMessages();
    }, [thread.threadId]);

    // ── Mark messages seen ────────────────────────────────────────────────────
    useEffect(() => {
        if (messages.length === 0) return;
        const unseenIds = messages
            .filter((m) => m.senderId._id !== currentUserId && !(m.seenBy || []).includes(currentUserId))
            .map((m) => m._id);
        if (unseenIds.length > 0) {
            markMessagesSeen(thread.threadId, unseenIds).catch(() => { });
        }
    }, [messages, thread.threadId, currentUserId]);

    // ── Socket events ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!token) return;
        const socket = getSocket(token);
        socket.emit("join_thread", thread.threadId);

        socket.on("new_message", (msg: Message) => {
            setMessages((prev) => {
                // Already in list (exact ID match) — skip
                if (prev.some((m) => m._id === msg._id)) return prev;
                // We sent this — replace our optimistic/real copy rather than appending
                if (ownedMessageIds.current.has(msg._id)) {
                    ownedMessageIds.current.delete(msg._id);
                    return prev;
                }
                return [...prev, msg];
            });
            setNewMsgIds((prev) => new Set(prev).add(msg._id));
            setTimeout(() => {
                setNewMsgIds((prev) => {
                    const next = new Set(prev);
                    next.delete(msg._id);
                    return next;
                });
            }, 600);
            socket.emit("message_delivered", { messageId: msg._id });
        });

        socket.on("user_typing", () => setIsTyping(true));
        socket.on("user_stop_typing", () => setIsTyping(false));

        socket.on("messages_seen", ({ messageIds, seenBy }: { messageIds: string[]; seenBy: string }) => {
            setMessages((prev) =>
                prev.map((m) =>
                    messageIds.includes(m._id) ? { ...m, seenBy: [...(m.seenBy || []), seenBy] } : m
                )
            );
        });

        socket.on("message_delivered", ({ messageId, userId }: { messageId: string; userId: string }) => {
            setMessages((prev) =>
                prev.map((m) =>
                    m._id === messageId ? { ...m, deliveredTo: [...(m.deliveredTo || []), userId] } : m
                )
            );
        });

        socket.on("reaction_update", ({ messageId, userId, emoji }: { messageId: string; userId: string; emoji: string }) => {
            setMessages((prev) =>
                prev.map((m) =>
                    m._id === messageId
                        ? { ...m, reactions: [...(m.reactions || []).filter((r) => r.userId !== userId), { userId, emoji }] }
                        : m
                )
            );
        });

        return () => {
            socket.emit("leave_thread", thread.threadId);
            socket.off("new_message");
            socket.off("user_typing");
            socket.off("user_stop_typing");
            socket.off("messages_seen");
            socket.off("message_delivered");
            socket.off("reaction_update");
        };
    }, [thread.threadId, token]);

    // ── Scroll to bottom ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!loading) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, loading]);

    // ── Load more ─────────────────────────────────────────────────────────────
    const loadMore = async () => {
        if (!hasMore || loadingMore || !cursor) return;
        try {
            setLoadingMore(true);
            const res = await getMessages(thread.threadId, cursor);
            const older: Message[] = res.data?.data || [];
            setMessages((prev) => [...older, ...prev]);
            if (older.length > 0) setCursor(older[0].createdAt);
            setHasMore(older.length === 30);
        } catch (err) {
            console.error("Failed to load more", err);
        } finally {
            setLoadingMore(false);
        }
    };

    // ── Send message ──────────────────────────────────────────────────────────
    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue.trim() || sending) return;
        const content = inputValue.trim();
        setInputValue("");

        const tempId = `temp_${Date.now()}`;
        const optimistic: Message = {
            _id: tempId,
            threadId: thread.threadId,
            senderId: { _id: currentUserId, username: "me" },
            content,
            createdAt: new Date().toISOString(),
            seenBy: [],
            deliveredTo: [],
            reactions: [],
        };
        setMessages((prev) => [...prev, optimistic]);
        setNewMsgIds((prev) => new Set(prev).add(tempId));

        try {
            setSending(true);
            const res = await sendMessage(thread.threadId, content);
            const real: Message = res.data?.data;
            if (real?._id) {
                // Register this ID so the socket handler knows to skip it
                ownedMessageIds.current.add(real._id);
                // Replace the optimistic bubble; also remove any dupe that socket may have added
                setMessages((prev) => {
                    const withoutDupes = prev.filter((m) => m._id !== real._id);
                    return withoutDupes.map((m) => (m._id === tempId ? real : m));
                });
            } else {
                // Fallback: remove temp and let socket deliver the real message
                setMessages((prev) => prev.filter((m) => m._id !== tempId));
            }
        } catch (err) {
            console.error("Failed to send message", err);
            // Remove optimistic bubble on failure
            setMessages((prev) => prev.filter((m) => m._id !== tempId));
        } finally {
            setSending(false);
        }
    };

    // ── Typing ────────────────────────────────────────────────────────────────
    const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        if (!token) return;
        const socket = getSocket(token);
        socket.emit("typing_start", { threadId: thread.threadId });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit("typing_stop", { threadId: thread.threadId });
        }, 1500);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // ── Status ────────────────────────────────────────────────────────────────
    const getStatus = (msg: Message) => {
        if (msg._id.startsWith("temp_")) return "sending";
        if ((msg.seenBy || []).filter((id) => id !== currentUserId).length > 0) return "read";
        if ((msg.deliveredTo || []).filter((id) => id !== currentUserId).length > 0) return "delivered";
        return "sent";
    };

    return (
        <div className="flex flex-col h-full w-full bg-white dark:bg-[#0a0a0a] relative overflow-hidden">

            {/* Subtle dot grid */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.025] dark:opacity-[0.05]"
                style={{
                    backgroundImage: "radial-gradient(circle, #888 1px, transparent 1px)",
                    backgroundSize: "28px 28px",
                }}
            />

            {/* ── Header ── */}
            <div className="relative z-10 px-4 py-3.5 border-b border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="md:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500 hover:text-black dark:hover:text-white"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <div className="relative">
                        <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 ring-2 ring-white dark:ring-zinc-800"
                            style={{ backgroundColor: getAvatarColor(username) }}
                        >
                            {username.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white dark:border-[#0a0a0a]" />
                    </div>

                    <div>
                        <p className="font-semibold text-sm text-black dark:text-white leading-none">{username}</p>
                        <p className={`text-[10px] font-medium mt-0.5 transition-colors ${isTyping ? "text-emerald-500" : "text-zinc-400"}`}>
                            {isTyping ? "typing..." : "active now"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-0.5">
                    {[Phone, Video, MoreHorizontal].map((Icon, i) => (
                        <button key={i} className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all">
                            <Icon size={16} strokeWidth={2} />
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Messages ── */}
            <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4 space-y-1">

                {/* Load more */}
                {hasMore && !loading && (
                    <div className="flex justify-center pb-2">
                        <button
                            onClick={loadMore}
                            disabled={loadingMore}
                            className="text-[10px] font-semibold tracking-widest uppercase text-zinc-400 hover:text-black dark:hover:text-white transition-colors flex items-center gap-1.5 py-1 px-3 rounded-full border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600"
                        >
                            {loadingMore && <Loader2 size={10} className="animate-spin" />}
                            {loadingMore ? "Loading..." : "Load older"}
                        </button>
                    </div>
                )}

                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={18} className="animate-spin text-zinc-300 dark:text-zinc-600" />
                    </div>
                )}

                {!loading && messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div
                            className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl ring-4 ring-white dark:ring-zinc-800 shadow-lg"
                            style={{ backgroundColor: getAvatarColor(username) }}
                        >
                            {username.slice(0, 2).toUpperCase()}
                        </div>
                        <p className="font-semibold text-sm text-black dark:text-white">{username}</p>
                        <p className="text-[11px] text-zinc-400 tracking-wide">Say hi to get things started 👋</p>
                    </div>
                )}

                {/* Date separator */}
                {!loading && messages.length > 0 && (
                    <div className="flex items-center gap-3 py-2">
                        <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
                        <span className="text-[10px] font-semibold text-zinc-400 tracking-widest uppercase">Today</span>
                        <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
                    </div>
                )}

                {/* Bubbles */}
                {messages.map((msg, i) => {
                    const isMine = msg.senderId._id === currentUserId;
                    const prevMsg = messages[i - 1];
                    const nextMsg = messages[i + 1];
                    const isFirst = !prevMsg || prevMsg.senderId._id !== msg.senderId._id;
                    const isLast = !nextMsg || nextMsg.senderId._id !== msg.senderId._id;
                    const isTemp = msg._id.startsWith("temp_");
                    const isNew = newMsgIds.has(msg._id);
                    const status = getStatus(msg);

                    // Bubble rounding — grouped messages get less rounding on connecting side
                    const myRadius = `${isFirst ? "20px" : "6px"} 20px 20px ${isLast ? "20px" : "6px"}`;
                    const theirRadius = `20px ${isFirst ? "20px" : "6px"} ${isLast ? "20px" : "6px"} 20px`;

                    return (
                        <div
                            key={msg._id}
                            className={`flex flex-col ${isMine ? "items-end" : "items-start"} ${isFirst && i > 0 ? "mt-3" : "mt-0.5"}`}
                            style={{
                                animation: isNew ? "slideIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards" : undefined,
                                opacity: isNew ? 0 : 1,
                            }}
                            onMouseEnter={() => setHoveredMsg(msg._id)}
                            onMouseLeave={() => setHoveredMsg(null)}
                        >
                            <div className="relative flex items-end gap-2 group max-w-[75%] md:max-w-[60%]">

                                {/* Their avatar — only on last in group */}
                                {!isMine && (
                                    <div className="w-6 h-6 shrink-0 mb-0.5">
                                        {isLast && (
                                            <div
                                                className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[9px]"
                                                style={{ backgroundColor: getAvatarColor(username) }}
                                            >
                                                {username.slice(0, 1).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Reaction picker */}
                                {hoveredMsg === msg._id && !isTemp && (
                                    <div
                                        className={`absolute ${isMine ? "right-full mr-2" : "left-full ml-2"} bottom-0 z-30 flex items-center gap-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-full px-2 py-1.5 shadow-xl`}
                                        style={{ animation: "popIn 0.15s cubic-bezier(0.34, 1.56, 0.64, 1) forwards" }}
                                    >
                                        {EMOJI_OPTIONS.map((emoji) => (
                                            <button
                                                key={emoji}
                                                className="w-7 h-7 flex items-center justify-center text-base hover:scale-125 transition-transform rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Optimistic update
                                                    setMessages((prev) =>
                                                        prev.map((m) =>
                                                            m._id === msg._id
                                                                ? {
                                                                      ...m,
                                                                      reactions: [
                                                                          ...(m.reactions || []).filter((r) => r.userId !== currentUserId),
                                                                          { userId: currentUserId, emoji },
                                                                      ],
                                                                  }
                                                                : m
                                                        )
                                                    );
                                                    setHoveredMsg(null);
                                                    addReaction(msg._id, emoji).catch(() => {
                                                        // Revert on failure
                                                        setMessages((prev) =>
                                                            prev.map((m) =>
                                                                m._id === msg._id
                                                                    ? { ...m, reactions: (m.reactions || []).filter((r) => r.userId !== currentUserId) }
                                                                    : m
                                                            )
                                                        );
                                                    });
                                                }}
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Bubble */}
                                <div
                                    className={`px-3.5 py-2.5 text-[14px] leading-relaxed transition-opacity ${isTemp ? "opacity-50" : "opacity-100"} ${
                                        isMine
                                            ? "bg-black text-white dark:bg-white dark:text-black"
                                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                                    }`}
                                    style={{
                                        borderRadius: isMine ? myRadius : theirRadius,
                                        wordBreak: "break-word",
                                    }}
                                >
                                    {msg.content}

                                    {/* Inline reactions */}
                                    {(msg.reactions?.length > 0) && (
                                        <div className="flex gap-0.5 mt-1.5 flex-wrap">
                                            {msg.reactions.map((r, ri) => (
                                                <span key={ri} className="text-xs bg-white/20 dark:bg-black/20 rounded-full px-1 py-0.5">{r.emoji}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Status + time — only on last in group for mine */}
                            {isMine && isLast && (
                                <div className="flex items-center gap-1.5 mt-1 pr-1">
                                    <span className="text-[10px] text-zinc-400">{formatTime(msg.createdAt)}</span>
                                    {status === "sending" && <span className="text-[10px] text-zinc-400">·</span>}
                                    {status === "read" && <span className="text-[10px] text-blue-400 font-medium">Read</span>}
                                    {status === "delivered" && <span className="text-[10px] text-zinc-400">Delivered</span>}
                                    {status === "sent" && <span className="text-[10px] text-zinc-400">Sent</span>}
                                </div>
                            )}
                            {/* Time for received — only last in group */}
                            {!isMine && isLast && (
                                <div className="flex items-center gap-1 mt-1 pl-8">
                                    <span className="text-[10px] text-zinc-400">{formatTime(msg.createdAt)}</span>
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Typing indicator */}
                {isTyping && (
                    <div className="flex items-end gap-2 mt-2" style={{ animation: "slideIn 0.2s ease forwards" }}>
                        <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[9px] shrink-0"
                            style={{ backgroundColor: getAvatarColor(username) }}
                        >
                            {username.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-[20px] rounded-bl-[6px] px-4 py-3 flex gap-1 items-center">
                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0ms", animationDuration: "0.8s" }} />
                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "150ms", animationDuration: "0.8s" }} />
                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "300ms", animationDuration: "0.8s" }} />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* ── Input ── */}
            <div className="relative z-10 px-4 py-3 border-t border-zinc-100 dark:border-zinc-800/60 bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/80 rounded-full px-4 py-2.5 border border-transparent focus-within:border-zinc-300 dark:focus-within:border-zinc-600 transition-all">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={handleTyping}
                            onKeyDown={handleKeyDown}
                            placeholder={`Message ${username}...`}
                            className="flex-1 bg-transparent outline-none text-sm text-black dark:text-white placeholder:text-zinc-400"
                        />
                        {!inputValue && (
                            <button className="text-zinc-400 hover:text-black dark:hover:text-white transition-colors shrink-0">
                                <SmilePlus size={16} />
                            </button>
                        )}
                    </div>

                    <button
                        onClick={() => handleSend()}
                        disabled={!inputValue.trim() || sending}
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                            inputValue.trim() && !sending
                                ? "bg-black dark:bg-white text-white dark:text-black hover:scale-105 active:scale-95 shadow-md"
                                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                        }`}
                    >
                        {sending
                            ? <Loader2 size={15} className="animate-spin" />
                            : <ArrowUp size={15} strokeWidth={2.5} />
                        }
                    </button>
                </div>
            </div>

            {/* Keyframe animations */}
            <style>{`
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(8px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0)   scale(1);    }
                }
                @keyframes popIn {
                    from { opacity: 0; transform: scale(0.8); }
                    to   { opacity: 1; transform: scale(1);   }
                }
            `}</style>
        </div>
    );
}