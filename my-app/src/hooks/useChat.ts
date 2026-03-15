"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getSocket } from "../lib/socket";

export interface Attachment {
    url: string;
    type: "image" | "video" | "audio" | "file";
    meta?: { width?: number; height?: number; duration?: number; size?: number };
}

export interface Message {
    _id: string;
    threadId: string;
    senderId: { _id: string; username: string };
    type: "text" | "media" | "post" | "system" | "forward";
    content?: string;
    attachments?: Attachment[];
    postId?: {
        _id: string;
        caption?: string;
        media?: { url: string; type: string }[];
        author?: { _id: string; username: string; profilePicture?: string };
    } | string;
    replyTo?: { _id: string; content?: string; senderId: { _id: string; username: string } };
    forwardedFrom?: { messageId: string; senderId: string };
    reactions: { userId: string; emoji: string }[];
    seenBy: string[];
    deliveredTo: string[];
    isEdited?: boolean;
    editedAt?: string;
    isDeleted?: boolean;
    pinnedBy?: string;
    pinnedAt?: string;
    createdAt: string;
}

export const useChat = (threadId: string, token: string) => {
    const [messages, setMessages] = useState<Message[]>([]);
    // Map of userId → username for "X is typing…" in groups
    const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});

    // Stable ref so cleanup functions always have the latest threadId
    const threadIdRef = useRef(threadId);
    useEffect(() => { threadIdRef.current = threadId; }, [threadId]);

    useEffect(() => {
        if (!threadId || !token) return;
        const socket = getSocket(token);

        socket.emit("join_thread", threadId);

        // ── Message events ────────────────────────────────────────────────────

        const onNewMessage = (message: Message) => {
            setMessages(prev =>
                prev.some(m => m._id === message._id) ? prev : [...prev, message]
            );
        };

        // thread_update carries lastMessage for inbox refresh — don't double-add
        // to the message list; that's already handled by new_message
        const onThreadUpdate = (_payload: { threadId: string; lastMessage: Message }) => {
            // Intentionally a no-op here; InboxList listens separately via useInbox
        };

        const onDelivered = ({ messageId, userId }: { messageId: string; userId: string }) => {
            setMessages(prev =>
                prev.map(m =>
                    m._id === messageId && !m.deliveredTo.includes(userId)
                        ? { ...m, deliveredTo: [...m.deliveredTo, userId] }
                        : m
                )
            );
        };

        const onSeen = ({ messageIds, seenBy }: { messageIds: string[]; seenBy: string }) => {
            setMessages(prev =>
                prev.map(m =>
                    messageIds.includes(m._id) && !m.seenBy.includes(seenBy)
                        ? { ...m, seenBy: [...m.seenBy, seenBy] }
                        : m
                )
            );
        };

        const onReactionUpdate = ({ messageId, userId, emoji }: {
            messageId: string; userId: string; emoji: string;
        }) => {
            setMessages(prev =>
                prev.map(m =>
                    m._id === messageId
                        ? { ...m, reactions: [...m.reactions.filter(r => r.userId !== userId), { userId, emoji }] }
                        : m
                )
            );
        };

        const onReactionRemoved = ({ messageId, userId }: { messageId: string; userId: string }) => {
            setMessages(prev =>
                prev.map(m =>
                    m._id === messageId
                        ? { ...m, reactions: m.reactions.filter(r => r.userId !== userId) }
                        : m
                )
            );
        };

        // Soft-deleted messages: replace content with tombstone instead of removing,
        // so reply-to previews and thread integrity are preserved
        const onDeleted = ({ messageId }: { messageId: string }) => {
            setMessages(prev =>
                prev.map(m =>
                    m._id === messageId
                        ? { ...m, isDeleted: true, content: undefined, attachments: [], reactions: [] }
                        : m
                )
            );
        };

        const onEdited = ({ messageId, content, isEdited, editedAt }: {
            messageId: string; content: string; isEdited: boolean; editedAt: string;
        }) => {
            setMessages(prev =>
                prev.map(m => m._id === messageId ? { ...m, content, isEdited, editedAt } : m)
            );
        };

        const onPinned = ({ messageId, pinnedBy, pinnedAt }: {
            messageId: string; pinnedBy: string; pinnedAt: string;
        }) => {
            setMessages(prev =>
                prev.map(m => m._id === messageId ? { ...m, pinnedBy, pinnedAt } : m)
            );
        };

        const onUnpinned = ({ messageId }: { messageId: string }) => {
            setMessages(prev =>
                prev.map(m =>
                    m._id === messageId
                        ? { ...m, pinnedBy: undefined, pinnedAt: undefined }
                        : m
                )
            );
        };

        // ── Typing indicators ─────────────────────────────────────────────────
        // Payload now includes userId so groups can show "Alice is typing…"
        const onTypingStart = ({ userId, threadId: tid }: { userId: string; threadId?: string }) => {
            if (tid && tid !== threadIdRef.current) return;
            setTypingUsers(prev => ({ ...prev, [userId]: userId }));
        };

        const onTypingStop = ({ userId, threadId: tid }: { userId: string; threadId?: string }) => {
            if (tid && tid !== threadIdRef.current) return;
            setTypingUsers(prev => {
                const next = { ...prev };
                delete next[userId];
                return next;
            });
        };

        socket.on("new_message",       onNewMessage);
        socket.on("thread_update",     onThreadUpdate);
        socket.on("message_delivered", onDelivered);
        socket.on("messages_seen",     onSeen);
        socket.on("reaction_update",   onReactionUpdate);
        socket.on("reaction_removed",  onReactionRemoved);
        socket.on("message_deleted",   onDeleted);
        socket.on("message_edited",    onEdited);
        socket.on("message_pinned",    onPinned);
        socket.on("message_unpinned",  onUnpinned);
        socket.on("user_typing",       onTypingStart);
        socket.on("user_stop_typing",  onTypingStop);

        return () => {
            socket.emit("leave_thread", threadId);
            socket.off("new_message",       onNewMessage);
            socket.off("thread_update",     onThreadUpdate);
            socket.off("message_delivered", onDelivered);
            socket.off("messages_seen",     onSeen);
            socket.off("reaction_update",   onReactionUpdate);
            socket.off("reaction_removed",  onReactionRemoved);
            socket.off("message_deleted",   onDeleted);
            socket.off("message_edited",    onEdited);
            socket.off("message_pinned",    onPinned);
            socket.off("message_unpinned",  onUnpinned);
            socket.off("user_typing",       onTypingStart);
            socket.off("user_stop_typing",  onTypingStop);
            // Clear typing state when leaving
            setTypingUsers({});
        };
    }, [threadId, token]);

    // ── Emitters ──────────────────────────────────────────────────────────────

    const emitTypingStart = useCallback(() => {
        getSocket(token).emit("typing_start", { threadId });
    }, [token, threadId]);

    const emitTypingStop = useCallback(() => {
        getSocket(token).emit("typing_stop", { threadId });
    }, [token, threadId]);

    const emitDelivered = useCallback((messageId: string) => {
        getSocket(token).emit("message_delivered", { messageId });
    }, [token]);

    const emitHeartbeat = useCallback(() => {
        getSocket(token).emit("heartbeat");
    }, [token]);

    // Derived: are any other users typing?
    const typingUserIds = Object.keys(typingUsers);
    const isTyping = typingUserIds.length > 0;

    return {
        messages,
        setMessages,
        isTyping,
        typingUsers,   // expose for "Alice & Bob are typing" in groups
        emitTypingStart,
        emitTypingStop,
        emitDelivered,
        emitHeartbeat,
    };
};