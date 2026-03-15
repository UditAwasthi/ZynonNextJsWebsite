"use client";

import { useState } from "react";
import { X, Users } from "lucide-react";
import { createGroupThread } from "../../lib/api/chatApi";
import UserSearchInput from "./UserSearchInput";
import { Avatar } from "./Avatar";
import type { SearchUser } from "../../lib/api/search";
import type { Thread } from "./InboxList";

interface Props {
    onClose: () => void;
    onCreated: (thread: Thread) => void;
}

export default function CreateGroupModal({ onClose, onCreated }: Props) {
    const [step, setStep] = useState<"members" | "name">("members");
    const [selected, setSelected] = useState<SearchUser[]>([]);
    const [groupName, setGroupName] = useState("");
    const [creating, setCreating] = useState(false);

    const toggle = (user: SearchUser) => {
        setSelected(prev =>
            prev.some(u => u._id === user._id)
                ? prev.filter(u => u._id !== user._id)
                : [...prev, user]
        );
    };

    const handleCreate = async () => {
        if (!groupName.trim() || selected.length < 2) return;
        setCreating(true);
        try {
            const res = await createGroupThread(groupName.trim(), selected.map(u => u._id));
            const raw = res.data?.data;
            // Service now returns inbox-compatible shape with threadId directly
            onCreated({
                threadId: raw.threadId ?? raw._id,
                type: "group",
                user: null,
                name: raw.name,
                avatar: raw.avatar ?? null,
                lastMessage: null,
                lastActivity: raw.lastActivity ?? raw.createdAt,
            });
        } catch {
        } finally {
            setCreating(false);
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
                    <span className="font-semibold text-[15px] dark:text-white">New Group</span>
                    {step === "members" ? (
                        <button
                            disabled={selected.length < 2}
                            onClick={() => setStep("name")}
                            className={`text-sm font-semibold transition-colors ${
                                selected.length >= 2 ? "text-black dark:text-white" : "text-zinc-300 dark:text-zinc-600"
                            }`}
                        >
                            Next
                        </button>
                    ) : (
                        <button
                            disabled={!groupName.trim() || creating}
                            onClick={handleCreate}
                            className={`text-sm font-semibold transition-colors ${
                                groupName.trim() && !creating ? "text-black dark:text-white" : "text-zinc-300 dark:text-zinc-600"
                            }`}
                        >
                            {creating ? "Creating…" : "Create"}
                        </button>
                    )}
                </div>

                {step === "members" ? (
                    <>
                        <UserSearchInput selected={selected} onToggle={toggle} />
                        {selected.length === 0 && (
                            <div className="flex flex-col items-center gap-2 py-10 text-zinc-400">
                                <Users size={28} />
                                <span className="text-sm">Search for people to add</span>
                                <span className="text-xs text-zinc-300 dark:text-zinc-600">Need at least 2 members</span>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="px-5 py-6 space-y-5">
                        <div className="flex justify-center">
                            <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                <Users size={30} className="text-zinc-400" />
                            </div>
                        </div>
                        <input
                            autoFocus
                            type="text"
                            placeholder="Group name"
                            value={groupName}
                            onChange={e => setGroupName(e.target.value)}
                            maxLength={50}
                            className="w-full text-center text-[17px] font-medium outline-none border-b-2 border-zinc-200 dark:border-zinc-700 focus:border-black dark:focus:border-white pb-2 bg-transparent dark:text-white placeholder-zinc-300 dark:placeholder-zinc-600 transition-colors"
                        />
                        <div className="flex justify-center flex-wrap gap-3 pt-1">
                            {selected.map(u => (
                                <div key={u._id} className="flex flex-col items-center gap-1">
                                    <Avatar src={u.profilePicture} name={u.username} size={36} />
                                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-[48px] truncate text-center">{u.username}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}