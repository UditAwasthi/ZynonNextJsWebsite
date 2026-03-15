"use client";

import { useEffect, useState } from "react";
import { X, Search, Send, Users,Check } from "lucide-react";
import { getInbox } from "../../lib/api/chatApi";
import { Avatar } from "./Avatar";
import type { Thread } from "./InboxList";

interface Props {
    onClose: () => void;
    onForward: (threadId: string) => Promise<void>;
}

export default function ForwardModal({ onClose, onForward }: Props) {
    const [threads, setThreads] = useState<Thread[]>([]);
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<string[]>([]);
    const [sending, setSending] = useState(false);
    const [sentIds, setSentIds] = useState<string[]>([]);   // threads already forwarded
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getInbox()
            .then(res => setThreads(res.data?.data ?? []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const filtered = threads.filter(t => {
        const name = t.type === "dm" ? t.user?.username : t.name;
        return !query || name?.toLowerCase().includes(query.toLowerCase());
    });

    const toggle = (id: string) => {
        if (sending) return;
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleSend = async () => {
        if (!selected.length || sending) return;
        setSending(true);
        try {
            for (const id of selected) {
                await onForward(id);
                // Mark each thread as sent as it completes — gives instant feedback
                setSentIds(prev => [...prev, id]);
            }
            // Brief pause so user sees the checkmarks before modal closes
            await new Promise(r => setTimeout(r, 600));
            onClose();
        } catch {
        } finally {
            setSending(false);
        }
    };

    const getName = (t: Thread) => t.type === "dm" ? t.user?.username ?? "Unknown" : t.name ?? "Group";
    const getAvatarSrc = (t: Thread) => t.type === "dm" ? t.user?.profilePicture : t.avatar;

   return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
            
            {/* Modal Container */}
            <div className="relative bg-white dark:bg-zinc-950 w-full max-w-[400px] rounded-[32px] shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-300">
                
                {/* Header */}
                <div className="px-6 py-5 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900">
                    <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 transition-colors">
                        <X size={20} />
                    </button>
                    <span className="font-black text-[16px] tracking-tight dark:text-white">Forward</span>
                    <button
                        disabled={!selected.length || sending}
                        onClick={handleSend}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                            selected.length && !sending 
                            ? "bg-zinc-900 dark:bg-white text-white dark:text-black scale-105 active:scale-95" 
                            : "bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600"
                        }`}
                    >
                        {sending ? (
                            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Send size={14} />
                        )}
                        <span>{sending ? `${sentIds.length}/${selected.length}` : "Send"}</span>
                    </button>
                </div>

                {/* Search Section */}
                <div className="px-5 py-3">
                    <div className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-900/50 rounded-2xl px-4 py-2.5 border border-transparent focus-within:border-zinc-200 dark:focus-within:border-zinc-800 transition-all">
                        <Search size={16} className="text-zinc-400" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search people..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            className="bg-transparent text-sm outline-none w-full dark:text-white placeholder-zinc-500 font-medium"
                        />
                    </div>
                </div>

                {/* List Section */}
                <div className="flex-1 overflow-y-auto max-h-[400px] px-2 pb-4 scrollbar-hide">
                    {loading ? (
                        <div className="space-y-1 px-4 py-2">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-center gap-3 py-3 animate-pulse">
                                    <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex-shrink-0" />
                                    <div className="h-3 bg-zinc-100 dark:bg-zinc-900 rounded-full w-24" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        filtered.map(thread => {
                            const isSel = selected.includes(thread.threadId);
                            const isSent = sentIds.includes(thread.threadId);
                            const name = thread.type === "dm" ? thread.user?.username ?? "Unknown" : thread.name ?? "Group";
                            
                            return (
                                <button
                                    key={thread.threadId}
                                    onClick={() => toggle(thread.threadId)}
                                    className={`w-full flex items-center justify-between p-3 rounded-3xl transition-all mb-1 ${
                                        isSel ? "bg-zinc-50 dark:bg-zinc-900" : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="relative flex-shrink-0">
                                            <Avatar
                                                src={thread.type === "dm" ? thread.user?.profilePicture : thread.avatar}
                                                name={name}
                                                size={48}
                                                isGroup={thread.type === "group"}
                                                className={`rounded-2xl transition-transform ${isSel ? 'scale-90' : ''}`}
                                            />
                                            {isSent && (
                                                <div className="absolute inset-0 rounded-2xl bg-blue-600/90 flex items-center justify-center animate-in zoom-in-50">
                                                    <Check size={24} className="text-white font-bold" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <span className={`text-[15px] font-bold ${isSent ? 'text-zinc-400' : 'dark:text-white'}`}>
                                                {name}
                                            </span>
                                            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                                                {thread.type === "group" ? "Group Chat" : "Message"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Selection Checkbox UI */}
                                    {!isSent && (
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                            isSel 
                                            ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-500/20" 
                                            : "border-zinc-200 dark:border-zinc-800"
                                        }`}>
                                            {isSel && <Check size={14} className="text-white stroke-[4px]" />}
                                        </div>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}