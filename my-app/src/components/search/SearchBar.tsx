"use client"

import { useState, useEffect, useRef, useCallback, KeyboardEvent } from "react"
import { useRouter } from "next/navigation"
import { Search, X, Loader2, ArrowRight, User } from "lucide-react"
import { fetchSuggestions, fetchSearchResults, SearchUser } from "../../lib/api/search"
import { enrichThreadsWithProfilePics } from "../../hooks/useInbox"
import { cacheUsers } from "../../lib/userSearchCache"

/* ─── DEBOUNCE HOOK ─── */
function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value)
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay)
        return () => clearTimeout(t)
    }, [value, delay])
    return debounced
}

/* ─── SUGGESTION ITEM ─── */
function SuggestionItem({
    user,
    isActive,
    onHover,
    onClick,
}: {
    user: SearchUser
    isActive: boolean
    onHover: () => void
    onClick: () => void
}) {
    return (
        <button
            onMouseEnter={onHover}
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-5 py-3 transition-all duration-150 group
                ${isActive
                    ? "bg-black dark:bg-white"
                    : "hover:bg-zinc-50 dark:hover:bg-white/[0.04]"
                }`}
        >
            {/* Avatar */}
            <div className={`relative w-8 h-8 rounded-[10px] overflow-hidden shrink-0 border
                ${isActive
                    ? "border-white/20 dark:border-black/20"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
            >
                {user.profilePicture ? (
                    <img
                        src={user.profilePicture}
                        alt={user.name}
                        className="w-full h-full object-cover grayscale"
                    />
                ) : (
                    <div className={`w-full h-full flex items-center justify-center
                        ${isActive ? "bg-white/10" : "bg-zinc-100 dark:bg-zinc-900"}`}
                    >
                        <User size={14} className={isActive ? "text-white dark:text-black" : "text-zinc-400"} />
                    </div>
                )}
                {/* Scanline overlay */}
                <div className="absolute inset-0 pointer-events-none"
                    style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 3px)" }} />
            </div>

            {/* Identity */}
            <div className="flex-1 text-left min-w-0">
                <div className={`text-[10px] font-bold tracking-[0.2em] uppercase truncate
                    ${isActive ? "text-white dark:text-black" : "text-black dark:text-white"}`}
                >
                    {user.username}
                </div>
                <div className={`text-[9px] tracking-[0.15em] uppercase truncate mt-0.5
                    ${isActive ? "text-white/60 dark:text-black/60" : "text-zinc-400 dark:text-zinc-600"}`}
                >
                    {user.name}
                </div>
            </div>

            {/* Arrow */}
            <ArrowRight
                size={12}
                className={`shrink-0 transition-all duration-150
                    ${isActive
                        ? "text-white dark:text-black translate-x-0 opacity-100"
                        : "text-zinc-300 dark:text-zinc-700 -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                    }`}
            />
        </button>
    )
}

/* ─── SUGGESTIONS DROPDOWN ─── */
function SuggestionsDropdown({
    suggestions,
    loading,
    activeIndex,
    query,
    onHover,
    onSelect,
    onSeeAll,
}: {
    suggestions: SearchUser[]
    loading: boolean
    activeIndex: number
    query: string
    onHover: (i: number) => void
    onSelect: (user: SearchUser) => void
    onSeeAll: () => void
}) {
    return (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 overflow-hidden
            bg-white dark:bg-[#0D0D0D]
            border border-zinc-200/80 dark:border-white/[0.06]
            rounded-[20px] shadow-xl dark:shadow-2xl
            font-mono"
        >
            {/* Dot grid bg */}
            <div className="absolute inset-0 nothing-dot-grid opacity-[0.02] dark:opacity-[0.05] pointer-events-none" />

            {/* Top status bar */}
            <div className="relative flex items-center justify-between px-5 py-2 border-b border-zinc-100 dark:border-white/[0.05] bg-zinc-50/60 dark:bg-transparent">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF0000] opacity-60"
                            style={{ animationDuration: "2s" }} />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#FF0000]" />
                    </span>
                    <span className="text-[7px] font-bold tracking-[0.3em] uppercase text-zinc-400 dark:text-zinc-500">
                        Suggestions
                    </span>
                </div>
                {loading && <Loader2 size={10} className="animate-spin text-zinc-400" />}
            </div>

            {/* Results */}
            <div className="relative max-h-[320px] overflow-y-auto">
                {loading && suggestions.length === 0 ? (
                    <div className="flex items-center justify-center py-8 gap-2">
                        <Loader2 size={13} className="animate-spin text-zinc-400" />
                        <span className="text-[9px] font-bold tracking-[0.25em] uppercase text-zinc-400">Scanning…</span>
                    </div>
                ) : suggestions.length === 0 ? (
                    <div className="px-5 py-8 text-center">
                        <div className="grid grid-cols-3 gap-[3px] w-fit mx-auto mb-3 opacity-20">
                            {[...Array(9)].map((_, i) => (
                                <div key={i} className="w-[3px] h-[3px] rounded-full bg-black dark:bg-white" />
                            ))}
                        </div>
                        <span className="text-[9px] font-bold tracking-[0.25em] uppercase text-zinc-400">
                            No nodes found
                        </span>
                    </div>
                ) : (
                    <>
                        {suggestions.map((user, i) => (
                            <SuggestionItem
                                key={user._id}
                                user={user}
                                isActive={i === activeIndex}
                                onHover={() => onHover(i)}
                                onClick={() => onSelect(user)}
                            />
                        ))}
                    </>
                )}
            </div>

            {/* Footer — "see all results" */}
            {suggestions.length > 0 && (
                <div className="relative border-t border-zinc-100 dark:border-white/[0.05]">
                    <button
                        onClick={onSeeAll}
                        className="w-full flex items-center justify-between px-5 py-3
                            text-[9px] font-bold tracking-[0.25em] uppercase
                            text-zinc-400 dark:text-zinc-500
                            hover:text-black dark:hover:text-white
                            hover:bg-zinc-50 dark:hover:bg-white/[0.03]
                            transition-all duration-200 group"
                    >
                        <span>See all results for "{query}"</span>
                        <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </div>
            )}
        </div>
    )
}

/* ─── SEARCH BAR ─── */
export function SearchBar({ className = "" }: { className?: string }) {
    const router = useRouter()
    const [query, setQuery] = useState("")
    const [suggestions, setSuggestions] = useState<SearchUser[]>([])
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)
    const [activeIndex, setActiveIndex] = useState(-1)
    const inputRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const debouncedQuery = useDebounce(query, 300)

    /* Fetch suggestions — parallel: suggestions API + full search, enriched with profile pics */
    useEffect(() => {
        if (debouncedQuery.length < 2) {
            setSuggestions([])
            setOpen(false)
            return
        }
        let cancelled = false
        setLoading(true)

        Promise.allSettled([
            fetchSuggestions(debouncedQuery),
            fetchSearchResults(debouncedQuery),
        ]).then(async ([suggestRes, searchRes]) => {
            if (cancelled) return

            // Merge both result sets, deduplicate by _id
            const seen = new Set<string>()
            const merged: SearchUser[] = []
            const addAll = (users: SearchUser[]) => {
                for (const u of users) {
                    if (!seen.has(u._id)) { seen.add(u._id); merged.push(u) }
                }
            }
            if (suggestRes.status === "fulfilled") addAll(suggestRes.value)
            if (searchRes.status === "fulfilled")  addAll(searchRes.value.users ?? [])

            // Cache for UserSearchInput reuse
            cacheUsers(merged)

            // Enrich with profile pics using shared _picCache
            const enriched = await enrichThreadsWithProfilePics(
                merged.map(u => ({
                    threadId: u._id,
                    type: "dm" as const,
                    user: { _id: u._id, username: u.username, profilePicture: u.profilePicture },
                    lastMessage: null,
                    lastActivity: "",
                }))
            )
            const withPics = merged.map(u => {
                const found = enriched.find(t => t.user?._id === u._id)
                return found?.user?.profilePicture
                    ? { ...u, profilePicture: found.user.profilePicture }
                    : u
            })

            if (!cancelled) {
                setSuggestions(withPics)
                setOpen(true)
                setActiveIndex(-1)
            }
        })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoading(false) })

        return () => { cancelled = true }
    }, [debouncedQuery])

    /* Close on outside click */
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [])

    const navigateToSearch = useCallback((q: string) => {
        if (!q.trim()) return
        setOpen(false)
        router.push(`/search?q=${encodeURIComponent(q.trim())}`)
    }, [router])

    const selectUser = useCallback((user: SearchUser) => {
        setQuery("")
        setOpen(false)
        router.push(`/profile/${user.username}`)
    }, [router])

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (!open) {
            if (e.key === "Enter") navigateToSearch(query)
            return
        }
        if (e.key === "ArrowDown") {
            e.preventDefault()
            setActiveIndex(i => Math.min(i + 1, suggestions.length - 1))
        } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setActiveIndex(i => Math.max(i - 1, -1))
        } else if (e.key === "Enter") {
            e.preventDefault()
            if (activeIndex >= 0 && suggestions[activeIndex]) {
                selectUser(suggestions[activeIndex])
            } else {
                navigateToSearch(query)
            }
        } else if (e.key === "Escape") {
            setOpen(false)
            setActiveIndex(-1)
        }
    }

    const clearQuery = () => {
        setQuery("")
        setSuggestions([])
        setOpen(false)
        inputRef.current?.focus()
    }

    return (
        <div ref={containerRef} className={`relative z-20 font-mono ${className}`}>
            {/* Input wrapper */}
            <div className={`flex items-center gap-3 px-5 py-3
                bg-white dark:bg-[#0D0D0D]
                border transition-all duration-200
                ${open || query
                    ? "border-black dark:border-white rounded-t-[20px] rounded-b-none shadow-lg"
                    : "border-zinc-200/80 dark:border-white/[0.06] rounded-[20px] shadow-md dark:shadow-xl"
                }`}
            >
                {/* Search icon / loader */}
                <div className="shrink-0">
                    {loading
                        ? <Loader2 size={15} className="animate-spin text-[#FF0000]" />
                        : <Search size={15} className={query ? "text-[#FF0000]" : "text-zinc-400 dark:text-zinc-600"} />
                    }
                </div>

                {/* Input */}
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
                    onKeyDown={handleKeyDown}
                    placeholder="Search nodes…"
                    className="flex-1 bg-transparent outline-none
                        text-[11px] font-bold tracking-[0.2em] uppercase
                        text-black dark:text-white
                        placeholder:text-zinc-300 dark:placeholder:text-zinc-700
                        placeholder:font-bold placeholder:tracking-[0.2em] placeholder:uppercase"
                />

                {/* Clear button */}
                {query && (
                    <button onClick={clearQuery} className="shrink-0 w-5 h-5 flex items-center justify-center
                        rounded-md border border-zinc-200 dark:border-zinc-800
                        hover:bg-black dark:hover:bg-white hover:border-black dark:hover:border-white
                        text-zinc-400 hover:text-white dark:hover:text-black transition-all duration-200">
                        <X size={10} />
                    </button>
                )}
            </div>

            {/* Dropdown */}
            {open && query.length >= 2 && (
                <div className="absolute top-full left-0 right-0 z-50 overflow-hidden
                    bg-white dark:bg-[#0D0D0D]
                    border-l border-r border-b border-black dark:border-white
                    rounded-b-[20px] shadow-xl dark:shadow-2xl">

                    {/* Dot grid bg */}
                    <div className="absolute inset-0 nothing-dot-grid opacity-[0.02] dark:opacity-[0.05] pointer-events-none" />

                    {/* Status bar */}
                    <div className="relative flex items-center justify-between px-5 py-2 border-b border-zinc-100 dark:border-white/[0.05]">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF0000] opacity-60"
                                    style={{ animationDuration: "2s" }} />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#FF0000]" />
                            </span>
                            <span className="text-[7px] font-bold tracking-[0.3em] uppercase text-zinc-400 dark:text-zinc-500">
                                Node · Suggestions
                            </span>
                        </div>
                        <span className="text-[7px] font-bold tracking-[0.3em] uppercase text-zinc-300 dark:text-zinc-700">
                            {suggestions.length} found
                        </span>
                    </div>

                    {/* Results */}
                    <div className="relative max-h-[300px] overflow-y-auto">
                        {loading && suggestions.length === 0 ? (
                            <div className="flex items-center justify-center py-7 gap-2">
                                <Loader2 size={12} className="animate-spin text-zinc-400" />
                                <span className="text-[9px] font-bold tracking-[0.25em] uppercase text-zinc-400">Scanning network…</span>
                            </div>
                        ) : suggestions.length === 0 ? (
                            <div className="px-5 py-7 text-center">
                                <div className="grid grid-cols-3 gap-[3px] w-fit mx-auto mb-3 opacity-20">
                                    {[...Array(9)].map((_, i) => (
                                        <div key={i} className="w-[3px] h-[3px] rounded-full bg-black dark:bg-white" />
                                    ))}
                                </div>
                                <span className="text-[9px] font-bold tracking-[0.25em] uppercase text-zinc-400">
                                    No nodes found
                                </span>
                            </div>
                        ) : (
                            suggestions.map((user, i) => (
                                <SuggestionItem
                                    key={user._id}
                                    user={user}
                                    isActive={i === activeIndex}
                                    onHover={() => setActiveIndex(i)}
                                    onClick={() => selectUser(user)}
                                />
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {(suggestions.length > 0 || (!loading && query.length >= 2)) && (
                        <div className="relative border-t border-zinc-100 dark:border-white/[0.05]">
                            <button
                                onClick={() => navigateToSearch(query)}
                                className="w-full flex items-center justify-between px-5 py-3
                                    text-[9px] font-bold tracking-[0.25em] uppercase
                                    text-zinc-400 dark:text-zinc-500
                                    hover:text-black dark:hover:text-white
                                    hover:bg-zinc-50 dark:hover:bg-white/[0.03]
                                    transition-all duration-200 group"
                            >
                                <span>See all results for "{query}"</span>
                                <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}