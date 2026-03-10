// hooks/useUnread.ts
import { useEffect, useState } from "react";
import { getSocket } from "../lib/socket";

export const useUnread = (token: string) => {
    const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});

    useEffect(() => {
        if (!token) return; // ✅ guard before anything

        const socket = getSocket(token);

        socket.on("unread_update", ({ threadId }: { threadId: string }) => {
            setUnreadMap(prev => ({
                ...prev,
                [threadId]: (prev[threadId] || 0) + 1
            }));
        });

        return () => {
            socket.off("unread_update");
        };
    }, [token]);

    const clearUnread = (threadId: string) => {
        setUnreadMap(prev => ({ ...prev, [threadId]: 0 }));
    };

    return { unreadMap, clearUnread };
};