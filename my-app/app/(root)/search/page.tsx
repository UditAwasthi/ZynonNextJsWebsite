"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { User, FileText, Search, AlertTriangle, Loader2, ArrowLeft, ArrowRight } from "lucide-react"
import { fetchSearchResults, SearchResults, SearchUser, SearchPost } from "../../../src/lib/api/search"
import { SearchBar } from "../../../src/components/search/SearchBar"

/* ─── DOT GRID ─── */
const DotGrid = () => (
    <div className="absolute inset-0 nothing-dot-grid opacity-[0.02] dark:opacity-[0.05] pointer-events-none" />
)

/* ─── SECTION LABEL ─── */
const SectionLabel = ({ icon: Icon, label, count }: { icon: any; label: string; count: number }) => (
    <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2.5">
            <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF0000] opacity-60"
                    style={{ animationDuration: "2s" }} />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#FF0000]" />
            </span>
            <Icon size={11} className="text-zinc-400" />
            <span className="text-[8px] font-bold tracking-[0.3em] uppercase text-zinc-400 dark:text-zinc-500 font-mono">
                {label}
            </span>
        </div>
        <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-900" />
        <span className="text-[8px] font-bold tracking-[0.3em] uppercase text-zinc-300 dark:text-zinc-700 font-mono">
            {count}
        </span>
    </div>
)

/* ─── USER RESULT CARD ─── */
function UserResultCard({ user }: { user: SearchUser }) {
    return (
        <Link href={`/profile/${user.username}`}>
            <div className="group relative overflow-hidden flex items-center gap-4 p-4
                bg-white dark:bg-[#0D0D0D]
                border border-zinc-200/80 dark:border-white/[0.06]
                rounded-[16px]
                hover:border-black dark:hover:border-white
                transition-all duration-300 cursor-pointer">

                <DotGrid />

                {/* Avatar */}
                <div className="relative w-11 h-11 rounded-[12px] overflow-hidden shrink-0
                    border border-zinc-200 dark:border-zinc-800">
                    {user.profilePicture ? (
                        <img
                            src={user.profilePicture}
                            alt={user.name}
                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                        />
                    ) : (
                        <div className="w-full h-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
                            <User size={16} className="text-zinc-400" />
                        </div>
                    )}
                    <div className="absolute inset-0 pointer-events-none"
                        style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 3px)" }} />
                </div>

                {/* Identity */}
                <div className="flex-1 min-w-0 font-mono">
                    <div className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#FF0000] mb-0.5">
                        {user.name}
                    </div>
                    <div className="text-sm font-bold tracking-[0.05em] uppercase text-black dark:text-white truncate"
                        style={{ fontFamily: "var(--font-nothing, monospace)" }}>
                        {user.username}
                    </div>
                </div>

                {/* Arrow */}
                <ArrowRight size={13}
                    className="shrink-0 text-zinc-300 dark:text-zinc-700 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-0.5 transition-all duration-200" />

                {/* Hover accent line */}
                <div className="absolute left-0 top-0 w-px h-full bg-[#FF0000] scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top" />
            </div>
        </Link>
    )
}

/* ─── POST RESULT CARD ─── */
function PostResultCard({ post }: { post: SearchPost }) {

    return (
        <Link href={`/posts/${post._id}`}>
            <div className="group relative overflow-hidden p-4
                bg-white dark:bg-[#0D0D0D]
                border border-zinc-200/80 dark:border-white/[0.06]
                rounded-[16px]
                hover:border-black dark:hover:border-white
                transition-all duration-300 cursor-pointer">

                <DotGrid />

                <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="relative w-9 h-9 rounded-[10px] shrink-0
                        border border-zinc-200 dark:border-zinc-800
                        bg-zinc-50 dark:bg-zinc-900/50
                        flex items-center justify-center group-hover:border-black dark:group-hover:border-white transition-colors">
                        <FileText size={14} className="text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 font-mono">
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[8px] font-bold tracking-[0.3em] uppercase text-zinc-400">
                                Post by
                            </span>
                            <div className="h-px w-3 bg-zinc-200 dark:bg-zinc-800" />
                            <span className="text-[8px] font-bold tracking-[0.3em] uppercase text-[#FF0000]">
                                @{post.author.username}
                            </span>
                        </div>
                        <p className="text-[11px] font-bold tracking-[0.05em] text-zinc-700 dark:text-zinc-300 line-clamp-2 leading-relaxed">
                            {post.caption || "No caption"}
                        </p>
                    </div>

                    <ArrowRight size={13}
                        className="shrink-0 mt-0.5 text-zinc-300 dark:text-zinc-700 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-0.5 transition-all duration-200" />
                </div>

                <div className="absolute left-0 top-0 w-px h-full bg-[#FF0000] scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top" />
            </div>
        </Link>
    )
}

/* ─── EMPTY STATE ─── */
function EmptyState({ query }: { query: string }) {
    return (
        <div className="relative overflow-hidden
            bg-white dark:bg-[#0D0D0D]
            border border-zinc-200/80 dark:border-white/[0.06]
            rounded-[28px] p-16 text-center font-mono">
            <DotGrid />
            <div className="grid grid-cols-5 gap-[4px] w-fit mx-auto mb-6 opacity-10">
                {[...Array(25)].map((_, i) => (
                    <div key={i} className="w-[4px] h-[4px] rounded-full bg-black dark:bg-white" />
                ))}
            </div>
            <div className="text-[8px] font-bold tracking-[0.3em] uppercase text-zinc-400 mb-2">
                Signal Lost
            </div>
            <div className="text-xl font-bold tracking-[0.05em] uppercase text-zinc-200 dark:text-zinc-800"
                style={{ fontFamily: "var(--font-nothing, monospace)" }}>
                No results for "{query}"
            </div>
        </div>
    )
}

/* ─── ERROR STATE ─── */
function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <div className="relative overflow-hidden
            bg-white dark:bg-[#0D0D0D]
            border border-[#FF0000]/20
            rounded-[28px] p-14 text-center font-mono">
            <DotGrid />
            <AlertTriangle size={24} className="text-[#FF0000] mx-auto mb-4 opacity-70" />
            <div className="text-[8px] font-bold tracking-[0.3em] uppercase text-[#FF0000] mb-2">
                Network Error
            </div>
            <p className="text-[10px] tracking-[0.15em] uppercase text-zinc-400 mb-6">
                Failed to retrieve search data
            </p>
            <button
                onClick={onRetry}
                className="px-6 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-[10px]
                    text-[9px] font-bold tracking-[0.2em] uppercase text-zinc-500 dark:text-zinc-400
                    hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black hover:border-black dark:hover:border-white
                    transition-all duration-200">
                Retry
            </button>
        </div>
    )
}

/* ─── LOADING STATE ─── */
function LoadingState() {
    return (
        <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse h-[68px] bg-zinc-100 dark:bg-zinc-900 rounded-[16px]"
                    style={{ animationDelay: `${i * 60}ms` }} />
            ))}
        </div>
    )
}

/* ─── SEARCH PAGE ─── */
function SearchPageInner() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const query = searchParams.get("q") || ""

    const [results, setResults] = useState<SearchResults | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(false)

    const runSearch = async (q: string) => {
        if (!q.trim()) return
        setLoading(true)
        setError(false)
        try {
            const data = await fetchSearchResults(q)
            console.log("Search results:", data)
            console.log("Posts:", data.posts)
            setResults(data)
        } catch {
            setError(true)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        runSearch(query)
    }, [query])

    const totalResults = (results?.users.length ?? 0) + (results?.posts.length ?? 0)

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-[#080808] font-mono">
            <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">

                {/* Back + Search Bar header */}
                <div className="relative
                    bg-white dark:bg-[#0D0D0D]
                    border border-zinc-200/80 dark:border-white/[0.06]
                    rounded-[28px] shadow-lg dark:shadow-2xl">

                    <DotGrid />

                    {/* Top status bar */}
                    <div className="relative flex items-center justify-between px-7 py-2.5
                        border-b border-zinc-100 dark:border-white/[0.05]
                        bg-zinc-50/60 dark:bg-transparent">
                        <div className="flex items-center gap-2.5">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF0000] opacity-60"
                                    style={{ animationDuration: "2s" }} />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#FF0000]" />
                            </span>
                            <span className="text-[7px] font-bold tracking-[0.3em] uppercase text-zinc-400 dark:text-zinc-500">
                                Network · Search
                            </span>
                        </div>
                        <div className="text-[7px] font-bold tracking-[0.3em] uppercase text-zinc-300 dark:text-zinc-700">
                            Ver 3.0
                        </div>
                    </div>

                    <div className="relative p-7 space-y-5 z-10">
                        {/* Back button */}
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-2.5 group">
                            <ArrowLeft size={12}
                                className="text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors group-hover:-translate-x-0.5 duration-200" />
                            <span className="text-[9px] font-bold tracking-[0.25em] uppercase text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors">
                                Back
                            </span>
                        </button>

                        {/* Search bar */}
                        <SearchBar />

                        {/* Query echo */}
                        {query && (
                            <div className="flex items-center gap-3">
                                <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-900" />
                                <div className="flex items-center gap-2">
                                    <Search size={9} className="text-zinc-400" />
                                    <span className="text-[8px] font-bold tracking-[0.25em] uppercase text-zinc-400">
                                        "{query}"
                                    </span>
                                    {!loading && results && (
                                        <>
                                            <div className="h-px w-3 bg-zinc-200 dark:bg-zinc-800" />
                                            <span className="text-[8px] font-bold tracking-[0.25em] uppercase text-[#FF0000]">
                                                {totalResults} nodes
                                            </span>
                                        </>
                                    )}
                                </div>
                                <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-900" />
                            </div>
                        )}
                    </div>

                    {/* Corner accents */}
                    <div className="absolute top-[40px] left-0 w-px h-8 bg-gradient-to-b from-[#FF0000]/40 to-transparent" />
                    <div className="absolute top-[40px] right-0 w-px h-8 bg-gradient-to-b from-zinc-300/60 dark:from-white/10 to-transparent" />
                </div>

                {/* Results */}
                {!query ? (
                    <div className="relative overflow-hidden
                        bg-white dark:bg-[#0D0D0D]
                        border border-zinc-200/80 dark:border-white/[0.06]
                        rounded-[28px] p-14 text-center">
                        <DotGrid />
                        <div className="grid grid-cols-4 gap-[4px] w-fit mx-auto mb-5 opacity-10">
                            {[...Array(16)].map((_, i) => (
                                <div key={i} className="w-[4px] h-[4px] rounded-full bg-black dark:bg-white" />
                            ))}
                        </div>
                        <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-zinc-400">
                            Enter a query to search the network
                        </span>
                    </div>
                ) : loading ? (
                    <LoadingState />
                ) : error ? (
                    <ErrorState onRetry={() => runSearch(query)} />
                ) : !results || totalResults === 0 ? (
                    <EmptyState query={query} />
                ) : (
                    <div className="space-y-8">
                        {/* Users section */}
                        {results.users.length > 0 && (
                            <section>
                                <SectionLabel icon={User} label="Users" count={results.users.length} />
                                <div className="space-y-2">
                                    {results.users.map(user => (
                                        <UserResultCard key={user._id} user={user} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Dot divider between sections */}
                        {results.users.length > 0 && results.posts.length > 0 && (
                            <div className="flex items-center gap-4">
                                <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-900" />
                                <div className="grid grid-cols-3 gap-[3px] opacity-20">
                                    {[...Array(9)].map((_, i) => (
                                        <div key={i} className="w-[3px] h-[3px] rounded-full bg-black dark:bg-white" />
                                    ))}
                                </div>
                                <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-900" />
                            </div>
                        )}

                        {/* Posts section */}
                        {results.posts.length > 0 && (
                            <section>
                                <SectionLabel icon={FileText} label="Posts" count={results.posts.length} />
                                <div className="space-y-2">
                                    {results.posts.map(post => (
                                        <PostResultCard key={post._id} post={post} />
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default function SearchPage() {
    return (
        <Suspense>
            <SearchPageInner />
        </Suspense>
    )
}