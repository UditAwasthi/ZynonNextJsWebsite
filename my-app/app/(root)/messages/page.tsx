"use client";

import { useState, useEffect } from "react";
import { MessageSquare } from "lucide-react";
import InboxList from "../../../src/components/messaging/InboxList";
import ChatThread from "../../../src/components/messaging/ChatThread";
import { useUnread } from "../../../src/hooks/useUnread";
import { getAccessToken, getCurrentUserId } from "../../../src/lib/auth";

interface Thread {
    threadId: string;
    type: "dm" | "group";
    user: { _id: string; username: string } | null;
    lastMessage: {
        content?: string;
        createdAt?: string;
        senderId?: string;
    } | null;
    lastActivity: string;
    unreadCount?: number;
}

export default function DirectPage() {
    const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
    const [token, setToken] = useState("");
    const [currentUserId, setCurrentUserId] = useState("");

    useEffect(() => {
        setToken(getAccessToken());
        setCurrentUserId(getCurrentUserId());
    }, []);

    // ✅ MUST be before any early return
    const { unreadMap, clearUnread } = useUnread(token);

    // ✅ early return comes AFTER all hooks
    if (!token || !currentUserId) return null;

    const handleSelect = (thread: Thread) => {
        setSelectedThread(thread);
        clearUnread(thread.threadId);
    };

    return (
        <div className="flex h-screen bg-white dark:bg-black overflow-hidden">
            {/* Sidebar — Inbox List */}
            <div
                className={`w-full md:w-[350px] lg:w-[400px] border-r border-zinc-300 dark:border-zinc-800 flex-shrink-0 transition-all ${
                    selectedThread ? "hidden md:flex" : "flex"
                }`}
            >
                <InboxList
                    onSelect={handleSelect}
                    activeId={selectedThread?.threadId}
                    currentUserId={currentUserId}
                    unreadMap={unreadMap}
                />
            </div>

            {/* Chat Panel */}
            <div
                className={`flex-1 flex flex-col transition-all ${
                    !selectedThread ? "hidden md:flex" : "flex"
                }`}
            >
                {selectedThread ? (
                    <ChatThread
                        thread={selectedThread}
                        onBack={() => setSelectedThread(null)}
                        currentUserId={currentUserId}
                        token={token}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full space-y-4">
                        <div className="p-5 border-2 border-black dark:border-white rounded-full">
                            <MessageSquare size={48} />
                        </div>
                        <h2 className="text-xl font-medium">Your Messages</h2>
                        <p className="text-zinc-500 text-sm text-center max-w-xs">
                            Select a conversation from the left to start messaging.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}