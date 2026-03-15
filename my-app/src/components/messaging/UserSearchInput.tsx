"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Check } from "lucide-react";
import { searchUsers } from "../../lib/userSearchCache";
import { Avatar } from "./Avatar";
import type { SearchUser } from "../../lib/api/search";

interface Props {
    selected: SearchUser[];
    onToggle: (user: SearchUser) => void;
    placeholder?: string;
    autoFocus?: boolean;
}

export default function UserSearchInput({ selected, onToggle, placeholder = "Search people…", autoFocus = true }: Props) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchUser[]>([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (autoFocus) inputRef.current?.focus();
    }, [autoFocus]);

    useEffect(() => {
        if (timer.current !== null) clearTimeout(timer.current ?? undefined);
        if (!query.trim()) { setResults([]); return; }
        setLoading(true);
        timer.current = setTimeout(async () => {
            try {
                const users = await searchUsers(query);
                // Filter out already-selected
                setResults(users.filter(u => !selected.some(s => s._id === u._id)));
            } catch {
            } finally {
                setLoading(false);
            }
        }, 250);
    }, [query, selected]);

    const handleToggle = (user: SearchUser) => {
        onToggle(user);
        setQuery("");
        inputRef.current?.focus();
    };

    return (
        <div>
            {/* Selected chips */}
            {selected.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-4 pt-3 pb-1">
                    {selected.map(u => (
                        <button
                            key={u._id}
                            onClick={() => onToggle(u)}
                            className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full pl-2 pr-2 py-1 transition-colors"
                        >
                            <Avatar src={u.profilePicture} name={u.username} size={18} />
                            <span className="text-sm dark:text-white font-medium">{u.username}</span>
                            <X size={12} className="text-zinc-400 flex-shrink-0" />
                        </button>
                    ))}
                </div>
            )}

            {/* Search input */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-zinc-100 dark:border-zinc-900">
                <Search size={15} className="text-zinc-400 flex-shrink-0" />
                <input
                    ref={inputRef}
                    type="text"
                    placeholder={placeholder}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="flex-1 text-[15px] outline-none bg-transparent dark:text-white placeholder-zinc-400"
                />
                {loading && (
                    <div className="w-4 h-4 border-2 border-zinc-300 dark:border-zinc-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                )}
                {query && !loading && (
                    <button onClick={() => setQuery("")} className="text-zinc-400 flex-shrink-0">
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Results */}
            <div className="overflow-y-auto max-h-64">
                {results.length === 0 && query.length > 0 && !loading ? (
                    <div className="text-center py-8 text-sm text-zinc-400">No users found</div>
                ) : results.length === 0 && !query ? null : (
                    results.map(user => {
                        const isSel = selected.some(s => s._id === user._id);
                        return (
                            <button
                                key={user._id}
                                onClick={() => handleToggle(user)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/80 transition-colors"
                            >
                                <Avatar src={user.profilePicture} name={user.username} size={44} />
                                <div className="flex-1 text-left min-w-0">
                                    <div className="text-sm font-semibold dark:text-white truncate">{user.username}</div>
                                    {user.name && user.name !== user.username && (
                                        <div className="text-xs text-zinc-400 truncate">{user.name}</div>
                                    )}
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                    isSel
                                        ? "bg-black dark:bg-white border-black dark:border-white"
                                        : "border-zinc-300 dark:border-zinc-600"
                                }`}>
                                    {isSel && <Check size={11} className="text-white dark:text-black" strokeWidth={3} />}
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}