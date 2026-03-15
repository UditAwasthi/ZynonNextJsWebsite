"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
    Reply, Forward, Pin, Trash2, Edit2, MoreHorizontal,
    Check, CheckCheck, Smile, FileText, PinOff
} from "lucide-react";
import type { Message } from "../../hooks/useChat";
import { Avatar } from "./Avatar";
import PostMessageCard from "./PostMessageCard";

const EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

interface Props {
    message: Message;
    isMine: boolean;
    currentUserId: string;
    isAdmin: boolean;
    senderProfilePicture?: string;
    showSenderInfo?: boolean;
    onReply: (msg: Message) => void;
    onEdit: (msg: Message) => void;
    onDelete: (messageId: string) => void;
    onReact: (messageId: string, emoji: string) => void;
    onForward: (msg: Message) => void;
    onPin: (messageId: string) => void;
}

export default function MessageBubble({
    message, isMine, currentUserId, isAdmin, senderProfilePicture,
    showSenderInfo = false, onReply, onEdit, onDelete, onReact, onForward, onPin
}: Props) {
    const [showMenu, setShowMenu] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);
    const [isPressing, setIsPressing] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const pressTimer = useRef<NodeJS.Timeout | null>(null);

    // Only text/forward messages can be edited; media/post cannot
    const canEdit = isMine && (message.type === "text" || (message.type === "forward" && !!message.content));
    const canDelete = isMine || isAdmin;
    const isPinned = !!message.pinnedBy;

    const myReaction = message.reactions.find(r => r.userId === currentUserId)?.emoji;

    const reactionMap = message.reactions.reduce<Record<string, number>>((acc, r) => {
        acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
        return acc;
    }, {});

    // Long-press for mobile menu
    const handleLongPress = useCallback(() => {
        setIsPressing(true);
        pressTimer.current = setTimeout(() => {
            setShowMenu(true);
            setIsPressing(false);
            if ("vibrate" in navigator) navigator.vibrate(10);
        }, 500);
    }, []);

    const cancelPress = useCallback(() => {
        if (pressTimer.current) clearTimeout(pressTimer.current);
        setIsPressing(false);
    }, []);

    // Close menu on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (!containerRef.current?.contains(e.target as Node)) {
                setShowMenu(false);
                setShowEmoji(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const time = new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // ── Deleted tombstone ─────────────────────────────────────────────────────
    if (message.isDeleted) {
        return (
            <div className={`flex items-center gap-3 ${isMine ? "flex-row-reverse" : "flex-row"} w-full mb-1 opacity-50`}>
                {!isMine && <div className="w-[34px] flex-shrink-0" />}
                <div className={`px-4 py-2.5 rounded-[18px] border border-dashed ${isMine
                        ? "border-zinc-300 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500"
                        : "border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500"
                    } text-[13px] italic`}>
                    Message deleted
                </div>
            </div>
        );
    }

    // ── Normalise postId — backend may send a plain string ID or a full object ──
    const rawPostId = message.postId;
    const postRef = rawPostId
        ? typeof rawPostId === "string"
            ? { _id: rawPostId }
            : rawPostId
        : null;

    // ── Post message — render card only, no text bubble ──────────────────────
    if (message.type === "post" && postRef) {
        return (
            <>
                <style>{`
                @keyframes fluidIn {
                    from { opacity: 0; transform: translateY(12px) scale(0.96); filter: blur(4px); }
                    to   { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
                }
                .bubble-spring { animation: fluidIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both; }
                `}</style>
                <div className={`bubble-spring flex items-end gap-3 ${isMine ? "flex-row-reverse" : "flex-row"} w-full mb-1`}>
                    {!isMine && (
                        <div className="flex-shrink-0 mb-1">
                            {showSenderInfo
                                ? <Avatar src={senderProfilePicture} name={message.senderId.username} size={34} className="rounded-xl shadow-sm" />
                                : <div className="w-[34px]" />
                            }
                        </div>
                    )}
                    <div className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                        {showSenderInfo && !isMine && (
                            <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 mb-1 ml-2 uppercase tracking-[0.15em]">
                                {message.senderId.username}
                            </span>
                        )}
                        <PostMessageCard post={postRef} isMine={isMine} />
                        <div className="mt-1.5 px-1">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">{time}</span>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // ── Seen indicator ────────────────────────────────────────────────────────
    // seenBy includes the sender themselves sometimes — exclude self for the check
    const seenByOthers = message.seenBy.filter(id => id !== currentUserId);

    return (
        <>
            <style>{`
            @keyframes fluidIn {
                from { opacity: 0; transform: translateY(12px) scale(0.96); filter: blur(4px); }
                to   { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
            }
            .bubble-spring { animation: fluidIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both; }
            .menu-blur { backdrop-filter: blur(16px); }
            .press-effect { transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
            .is-pressing { transform: scale(0.96); filter: brightness(0.9); }
            @media (pointer: coarse) { .desktop-actions { display: none !important; } }
        `}</style>

            <div
                ref={containerRef}
                className={`bubble-spring group flex items-end gap-3 ${isMine ? "flex-row-reverse" : "flex-row"} w-full mb-1`}
                onTouchStart={handleLongPress}
                onTouchEnd={cancelPress}
                onContextMenu={e => e.preventDefault()}
            >
                {/* Sender avatar */}
                {!isMine && (
                    <div className="flex-shrink-0 mb-1 transition-transform group-hover:scale-105 duration-300">
                        {showSenderInfo
                            ? <Avatar src={senderProfilePicture} name={message.senderId.username} size={34} className="rounded-xl shadow-sm" />
                            : <div className="w-[34px]" />
                        }
                    </div>
                )}

                <div className={`flex flex-col ${isMine ? "items-end" : "items-start"} max-w-[85%] sm:max-w-[70%]`}>

                    {showSenderInfo && !isMine && (
                        <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 mb-1 ml-2 uppercase tracking-[0.15em]">
                            {message.senderId.username}
                        </span>
                    )}

                    {/* Reply context */}
                    {message.replyTo && (
                        <div className={`mb-1 px-3 py-2 rounded-[18px] text-[13px] bg-zinc-100/50 dark:bg-zinc-800/40 border border-zinc-200/50 dark:border-zinc-700/30 backdrop-blur-sm opacity-90 ${isMine ? "mr-2" : "ml-2"}`}>
                            <div className="flex items-center gap-2 mb-0.5">
                                <Reply size={12} className="text-blue-500" />
                                <span className="font-bold text-blue-600 dark:text-blue-400">{message.replyTo.senderId?.username}</span>
                            </div>
                            <p className="text-zinc-500 dark:text-zinc-400 truncate max-w-[180px] italic leading-tight">
                                {message.replyTo.content || "Media"}
                            </p>
                        </div>
                    )}

                    {/* Pinned indicator */}
                    {isPinned && (
                        <div className={`flex items-center gap-1 mb-1 text-[10px] font-bold text-amber-500 uppercase tracking-wider ${isMine ? "mr-2" : "ml-2"}`}>
                            <Pin size={10} />
                            <span>Pinned</span>
                        </div>
                    )}
                    <div className={`relative flex items-center gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>

                        {/* Bubble */}
                        <div className={`press-effect ${isPressing ? "is-pressing" : ""} relative transition-all duration-300 ${isMine
                                ? "bg-zinc-900 dark:bg-white text-white dark:text-black shadow-lg shadow-zinc-200/50 dark:shadow-none"
                                : "bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 border border-zinc-100 dark:border-zinc-800 shadow-sm"
                            } rounded-[22px] ${isMine ? "rounded-tr-none" : "rounded-tl-none"} overflow-hidden`}>

                            {/* Attachments */}
                            {message.attachments?.map((file, idx) => (
                                <div key={idx} className="p-1">
                                    {file.type === "image" ? (
                                        <img src={file.url} alt="Media" className="rounded-[18px] max-h-80 w-full object-cover" />
                                    ) : (
                                        <div className="p-4 flex items-center gap-3 bg-zinc-50/10 rounded-[18px] min-w-[200px]">
                                            <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl"><FileText size={20} /></div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-bold truncate">Attachment</span>
                                                <span className="text-[10px] opacity-60 uppercase">Click to view</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {message.content && (
                                // select-text (not select-none) so users can copy messages
                                <div className="px-5 py-3 text-[15px] leading-relaxed font-medium select-text">
                                    {message.content}
                                    {/* Inline edited badge */}
                                    {message.isEdited && (
                                        <span className="ml-2 text-[10px] opacity-50 italic align-middle">edited</span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Desktop hover controls */}
                        <div className="desktop-actions flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                            <button onClick={() => setShowEmoji(!showEmoji)} className="p-2 rounded-full hover:bg-white dark:hover:bg-zinc-800 shadow-sm text-zinc-400 hover:text-blue-500 transition-all active:scale-90">
                                <Smile size={17} />
                            </button>
                            <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-full hover:bg-white dark:hover:bg-zinc-800 shadow-sm text-zinc-400 transition-all active:scale-90">
                                <MoreHorizontal size={17} />
                            </button>
                        </div>

                        {/* Context menu */}
                        {showMenu && (
                            <>
                                <div className="fixed inset-0 z-40 bg-black/5 dark:bg-black/20 backdrop-blur-[1px]" onClick={() => setShowMenu(false)} />
                                <div className={`absolute bottom-full mb-3 z-50 w-56 bg-white/95 dark:bg-zinc-900/95 menu-blur rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/20 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 ${isMine ? "right-0" : "left-0"}`}>
                                    {/* Emoji row */}
                                    <div className="p-2 flex justify-around border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-800/20">
                                        {EMOJIS.map(emoji => (
                                            <button
                                                key={emoji}
                                                onClick={() => { onReact(message._id, emoji); setShowMenu(false); }}
                                                className="text-2xl hover:scale-125 transition-all p-2 active:scale-150"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                    <MenuItem icon={<Reply size={18} />} label="Reply" onClick={() => { onReply(message); setShowMenu(false); }} />
                                    <MenuItem icon={<Forward size={18} />} label="Forward" onClick={() => { onForward(message); setShowMenu(false); }} />
                                    <MenuItem
                                        icon={isPinned ? <PinOff size={18} /> : <Pin size={18} />}
                                        label={isPinned ? "Unpin" : "Pin"}
                                        onClick={() => { onPin(message._id); setShowMenu(false); }}
                                    />
                                    {canEdit && (
                                        <MenuItem icon={<Edit2 size={18} />} label="Edit" onClick={() => { onEdit(message); setShowMenu(false); }} />
                                    )}
                                    <div className="h-px bg-zinc-100 dark:bg-zinc-800/50 mx-4 my-1" />
                                    {canDelete && (
                                        <MenuItem icon={<Trash2 size={18} />} label="Delete" danger onClick={() => { onDelete(message._id); setShowMenu(false); }} />
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer: reactions + timestamp + seen */}
                    <div className={`mt-1.5 flex items-center gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                        {Object.entries(reactionMap).length > 0 && (
                            <div className="flex items-center gap-1 animate-in zoom-in duration-300">
                                {Object.entries(reactionMap).map(([emoji, count]) => (
                                    <button
                                        key={emoji}
                                        onClick={() => onReact(message._id, emoji)}
                                        className={`flex items-center px-2 py-0.5 rounded-full border shadow-sm text-[12px] transition-all hover:scale-110 ${myReaction === emoji
                                                ? "bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800"
                                                : "bg-white border-zinc-100 dark:bg-zinc-800 dark:border-zinc-700"
                                            }`}
                                    >
                                        <span>{emoji}</span>
                                        {count > 1 && (
                                            <span className={`ml-1 font-bold ${myReaction === emoji ? "text-blue-600" : "text-zinc-500"}`}>
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center gap-1.5 px-1">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">{time}</span>
                            {isMine && (
                                <div className="flex items-center">
                                    {seenByOthers.length > 0
                                        ? <CheckCheck size={13} className="text-blue-500" />
                                        : <Check size={13} className="text-zinc-300" />
                                    }
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

function MenuItem({ icon, label, onClick, danger = false }: {
    icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center justify-between px-5 py-3.5 text-[14px] font-bold transition-all active:bg-zinc-100 dark:active:bg-zinc-800 ${danger
                    ? "text-red-500 hover:bg-red-500 hover:text-white"
                    : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-900 dark:hover:bg-white hover:text-white dark:hover:text-black"
                }`}
        >
            <span>{label}</span>
            <span className="opacity-50 group-hover:opacity-100">{icon}</span>
        </button>
    );
}