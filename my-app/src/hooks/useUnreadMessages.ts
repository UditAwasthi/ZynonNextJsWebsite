"use client";

// useUnreadMessages.ts — sidebar adapter
//
// Reads the totalUnread from useUnread and clears it when the user
// navigates to /messages. This hook owns NO socket listeners of its own —
// all socket work lives in useUnread to avoid double-counting.

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useUnread } from "./useUnread";

export function useUnreadMessages(token: string) {
    const { totalUnread, setActiveThread, unreadMap, clearUnread } = useUnread(token);
    const pathname = usePathname();

    // When user navigates away from /messages entirely, clear active thread
    useEffect(() => {
        if (!pathname?.startsWith("/messages")) {
            setActiveThread(null);
        }
    }, [pathname, setActiveThread]);

    return {
        unreadMessageCount: totalUnread,
        hasUnreadMessages: totalUnread > 0,
        unreadMap,
        clearUnread,
        setActiveThread,
    };
}