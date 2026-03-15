"use client";

import { useState } from "react";
import { X, UserPlus, Check } from "lucide-react";
import { addMember } from "../../lib/api/chatApi";
import UserSearchInput from "./UserSearchInput";
import type { SearchUser } from "../../lib/api/search";

interface Props {
    threadId: string;
    onClose: () => void;
}

export default function AddMemberModal({ threadId, onClose }: Props) {
    const [selected, setSelected] = useState<SearchUser[]>([]);
    const [adding, setAdding] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggle = (user: SearchUser) => {
        setSelected(prev =>
            prev.some(u => u._id === user._id)
                ? prev.filter(u => u._id !== user._id)
                : [...prev, user]
        );
    };

    const handleAdd = async () => {
        if (!selected.length || adding) return;
        setAdding(true);
        setError(null);
        try {
            // Add each selected member one at a time
            await Promise.all(
                selected.map(u => addMember(threadId, u._id))
            );
            setDone(true);
            setTimeout(onClose, 1000);
        } catch (err: any) {
            setError(err?.response?.data?.message ?? "Failed to add member");
        } finally {
            setAdding(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
            <div className="bg-white dark:bg-zinc-950 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl border-t sm:border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                {/* Handle for mobile */}
                <div className="flex justify-center pt-3 pb-1 sm:hidden">
                    <div className="w-9 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-900">
                    <button onClick={onClose} className="text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                    <span className="font-semibold text-[15px] dark:text-white">Add Members</span>
                    <button
                        disabled={!selected.length || adding || done}
                        onClick={handleAdd}
                        className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${
                            selected.length && !adding && !done
                                ? "text-black dark:text-white"
                                : "text-zinc-300 dark:text-zinc-600"
                        }`}
                    >
                        {done ? (
                            <><Check size={14} className="text-green-500" /> Done</>
                        ) : adding ? (
                            <span className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <><UserPlus size={14} /> Add{selected.length > 0 ? ` (${selected.length})` : ""}</>
                        )}
                    </button>
                </div>

                <UserSearchInput selected={selected} onToggle={toggle} />

                {error && (
                    <p className="text-center text-xs text-red-500 pb-3 px-4">{error}</p>
                )}

                {!selected.length && (
                    <div className="flex flex-col items-center gap-2 py-10 text-zinc-400">
                        <UserPlus size={28} />
                        <span className="text-sm">Search for people to add</span>
                    </div>
                )}
            </div>
        </div>
    );
}