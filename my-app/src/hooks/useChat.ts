import { useEffect, useState } from "react";
import { getSocket } from "../lib/socket";

interface Message {
    _id: string;
    threadId: string;
    senderId: { _id: string; username: string };
    content: string;
    createdAt: string;
    seenBy: string[];
    deliveredTo: string[];  // ← add this
    reactions: { userId: string; emoji: string }[];
}

export const useChat = (threadId: string, token: string) => {

    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);

    useEffect(() => {
        const socket = getSocket(token);

        // Join thread room
        socket.emit("join_thread", threadId);

        // New message
        socket.on("new_message", (message: Message) => {
            setMessages(prev => [...prev, message]);
        });

        // Typing indicators
        socket.on("user_typing", () => setIsTyping(true));
        socket.on("user_stop_typing", () => setIsTyping(false));

        //delievered
        socket.on("message_delivered", ({ messageId, userId }: { messageId: string, userId: string }) => {
            setMessages(prev =>
                prev.map(msg =>
                    msg._id === messageId
                        ? { ...msg, deliveredTo: [...msg.deliveredTo, userId] }
                        : msg
                )
            );
        });
        // Read receipts
        socket.on("messages_seen", ({ messageIds, seenBy }: { messageIds: string[], seenBy: string }) => {
            setMessages(prev =>
                prev.map(msg =>
                    messageIds.includes(msg._id)
                        ? { ...msg, seenBy: [...msg.seenBy, seenBy] }
                        : msg
                )
            );
        });

        // Reactions
        socket.on("reaction_update", ({ messageId, userId, emoji }: { messageId: string, userId: string, emoji: string }) => {
            setMessages(prev =>
                prev.map(msg =>
                    msg._id === messageId
                        ? { ...msg, reactions: [...msg.reactions.filter(r => r.userId !== userId), { userId, emoji }] }
                        : msg
                )
            );
        });

        return () => {
            socket.emit("leave_thread", threadId);
            socket.off("new_message");
            socket.off("user_typing");
            socket.off("user_stop_typing");
            socket.off("messages_seen");
            socket.off("reaction_update");
            socket.off("message_delivered");  // ← add this
        };
    }, [threadId, token]);

    // Typing emitters
    const emitTypingStart = () => {
        getSocket(token).emit("typing_start", { threadId });
    };

    const emitTypingStop = () => {
        getSocket(token).emit("typing_stop", { threadId });
    };

    // Message delivered
    const emitDelivered = (messageId: string) => {
        getSocket(token).emit("message_delivered", { messageId });
    };

    return {
        messages,
        setMessages,
        isTyping,
        emitTypingStart,
        emitTypingStop,
        emitDelivered
    };
};