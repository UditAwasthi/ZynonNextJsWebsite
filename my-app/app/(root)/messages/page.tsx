"use client";

import { useState, useEffect } from "react";
import { Edit } from "lucide-react";
import InboxList from "../../../src/components/messaging/InboxList";
import ChatThread from "../../../src/components/messaging/ChatThread";
import { useUnread } from "../../../src/hooks/useUnread";
import { getAccessToken, getCurrentUserId } from "../../../src/lib/auth";
import { getInbox } from "../../../src/lib/api/chatApi";
import { DM_HANDOFF_KEY } from "../../../src/components/messaging/MessageButton";
import type { Thread } from "../../../src/components/messaging/InboxList";

export default function DirectPage() {
    const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
    const [token, setToken] = useState("");
    const [currentUserId, setCurrentUserId] = useState("");

    useEffect(() => {
        setToken(getAccessToken());
        setCurrentUserId(getCurrentUserId());
    }, []);

    // Open thread left by MessageButton handoff
    useEffect(() => {
        if (!token) return;
        const pendingId = sessionStorage.getItem(DM_HANDOFF_KEY);
        if (!pendingId) return;
        sessionStorage.removeItem(DM_HANDOFF_KEY);

        getInbox()
            .then(res => {
                const threads: Thread[] = res.data?.data ?? [];
                const match = threads.find(t => t.threadId === pendingId);
                setSelectedThread(match ?? {
                    threadId: pendingId,
                    type: "dm",
                    user: null,
                    lastMessage: null,
                    lastActivity: new Date().toISOString(),
                });
            })
            .catch(() => {});
    }, [token]);

    const { unreadMap, clearUnread } = useUnread(token);

    if (!token || !currentUserId) return null;

    const handleSelect = (thread: Thread) => {
        setSelectedThread(thread);
        clearUnread(thread.threadId);
    };

    return (
        // Fills the viewport space left by the Sidebar's fixed bars.
        // On mobile: 100dvh minus top bar (56px) and bottom bar (64px) + safe-area insets.
        // On desktop (md+): fill whatever the layout gives (h-screen from parent).
        <div
            className="flex bg-white dark:bg-black overflow-hidden
                        h-[calc(100dvh-56px-64px-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))]
                        md:h-screen"
        >
            {/* ── Inbox panel ─────────────────────────────────────────────── */}
            <div
                className={`
                    flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800
                    flex flex-col
                    w-full md:w-[397px]
                    ${selectedThread ? "hidden md:flex" : "flex"}
                `}
            >
                <InboxList
                    onSelect={handleSelect}
                    activeId={selectedThread?.threadId}
                    currentUserId={currentUserId}
                    token={token}
                    unreadMap={unreadMap}
                />
            </div>

            {/* ── Chat / empty state ───────────────────────────────────────── */}
            <div className={`flex-1 flex flex-col min-w-0 ${!selectedThread ? "hidden md:flex" : "flex"}`}>
                {selectedThread ? (
                    <ChatThread
                        thread={selectedThread}
                        onBack={() => setSelectedThread(null)}
                        currentUserId={currentUserId}
                        token={token}
                    />
                ) : (
                    // Instagram's empty state: camera icon outline + "Your messages" text
                    <div className="flex flex-col items-center justify-center h-full gap-4 select-none">
                        <div className="w-[76px] h-[76px] rounded-full border-[2.5px] border-black dark:border-white flex items-center justify-center">
                            <Edit size={32} strokeWidth={1.5} className="text-black dark:text-white" />
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-semibold text-black dark:text-white mb-1">Your messages</p>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Send private photos and messages to a friend or group.
                            </p>
                        </div>
                        <button
                            onClick={() => {/* could open new message modal */}}
                            className="mt-1 px-4 py-1.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                        >
                            Send message
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}