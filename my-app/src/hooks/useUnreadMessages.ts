"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { getSocket } from "../lib/socket";
import type { Notification } from "../components/notifications/types";

export function useUnreadMessages() {
    const [hasUnread, setHasUnread] = useState(false);
    const pathname = usePathname();

    // Clear when user navigates to messages
    useEffect(() => {
        if (pathname?.startsWith("/messages")) {
            setHasUnread(false);
        }
    }, [pathname]);

    useEffect(() => {
        const token = typeof window !== "undefined"
            ? localStorage.getItem("accessToken") : null;
        if (!token) return;

        let socket: ReturnType<typeof getSocket>;
        try { socket = getSocket(token); } catch { return; }

        const markUnread = () => {
            if (!window.location.pathname.startsWith("/messages")) {
                setHasUnread(true);
            }
        };

        // new_message: fired by backend for every message in a thread room
        socket.on("new_message", markUnread);

        // notification:new with NEW_MESSAGE type — fired even when not in thread room,
        // making this the reliable trigger when the user hasn't opened the chat yet
        const notifHandler = (notif: Notification) => {
            if (notif?.type === "NEW_MESSAGE") markUnread();
        };
        socket.on("notification:new", notifHandler);

        return () => {
            socket.off("new_message", markUnread);
            socket.off("notification:new", notifHandler);
        };
    }, []);

    return { hasUnreadMessages: hasUnread };
}