import { useEffect, useState, useCallback } from "react";
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
    postId?: { _id: string; caption?: string; media?: { url: string; type: string }[] };
    replyTo?: { _id: string; content?: string; senderId: { _id: string; username: string } };
    forwardedFrom?: { messageId: string; senderId: string };
    reactions: { userId: string; emoji: string }[];
    seenBy: string[];
    deliveredTo: string[];
    isEdited?: boolean;
    editedAt?: string;
    pinnedBy?: string;
    pinnedAt?: string;
    createdAt: string;
}

export const useChat = (threadId: string, token: string) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);

    useEffect(() => {
        if (!threadId || !token) return;
        const socket = getSocket(token);

        socket.emit("join_thread", threadId);

        const onNewMessage = (message: Message) => {
            setMessages(prev =>
                prev.some(m => m._id === message._id) ? prev : [...prev, message]
            );
        };

        const onThreadUpdate = ({ lastMessage }: { threadId: string; lastMessage: Message }) => {
            setMessages(prev =>
                prev.some(m => m._id === lastMessage._id) ? prev : [...prev, lastMessage]
            );
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

        const onReaction = ({ messageId, userId, emoji }: { messageId: string; userId: string; emoji: string }) => {
            setMessages(prev =>
                prev.map(m =>
                    m._id === messageId
                        ? { ...m, reactions: [...m.reactions.filter(r => r.userId !== userId), { userId, emoji }] }
                        : m
                )
            );
        };

        const onDeleted = ({ messageId }: { messageId: string }) => {
            setMessages(prev => prev.filter(m => m._id !== messageId));
        };

        const onEdited = ({ messageId, content, isEdited, editedAt }: {
            messageId: string; content: string; isEdited: boolean; editedAt: string;
        }) => {
            setMessages(prev =>
                prev.map(m => m._id === messageId ? { ...m, content, isEdited, editedAt } : m)
            );
        };

        socket.on("new_message", onNewMessage);
        socket.on("thread_update", onThreadUpdate);
        socket.on("user_typing", () => setIsTyping(true));
        socket.on("user_stop_typing", () => setIsTyping(false));
        socket.on("message_delivered", onDelivered);
        socket.on("messages_seen", onSeen);
        socket.on("reaction_update", onReaction);
        socket.on("message_deleted", onDeleted);
        socket.on("message_edited", onEdited);

        return () => {
            socket.emit("leave_thread", threadId);
            socket.off("new_message", onNewMessage);
            socket.off("thread_update", onThreadUpdate);
            socket.off("user_typing");
            socket.off("user_stop_typing");
            socket.off("message_delivered", onDelivered);
            socket.off("messages_seen", onSeen);
            socket.off("reaction_update", onReaction);
            socket.off("message_deleted", onDeleted);
            socket.off("message_edited", onEdited);
        };
    }, [threadId, token]);

    const emitTypingStart = useCallback(() => {
        getSocket(token).emit("typing_start", { threadId });
    }, [token, threadId]);

    const emitTypingStop = useCallback(() => {
        getSocket(token).emit("typing_stop", { threadId });
    }, [token, threadId]);

    const emitDelivered = useCallback((messageId: string) => {
        getSocket(token).emit("message_delivered", { messageId });
    }, [token]);

    return { messages, setMessages, isTyping, emitTypingStart, emitTypingStop, emitDelivered };
};