"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { getUserPosts } from "../../lib/api/postApi"
import { Heart, MessageCircle, Copy, Eye } from "lucide-react"
import { cache, TTL } from "../../lib/cache"

interface Post {
    _id: string
    media: { url: string; type: "image" | "video" }[]
    caption?: string
    createdAt: string
    likesCount: number
    commentsCount: number
}

interface PostGridProps { userId: string }

// Cache key per user + cursor page
const postCacheKey = (userId: string, cursor?: string) =>
    `posts:${userId}:${cursor ?? "first"}`

const GCSS = `
@keyframes ntg-shimmer   { from{background-position:200% 0} to{background-position:-200% 0} }
@keyframes ntg-tile-in   { from{opacity:0;transform:scale(.93) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
@keyframes ntg-dot-blink { 0%,100%{opacity:1} 50%{opacity:0.12} }
@keyframes ntg-scan      { 0%{transform:translateY(-100%)} 100%{transform:translateY(500%)} }
@keyframes ntg-live-ping { 0%{transform:scale(1);opacity:0.8} 100%{transform:scale(2.6);opacity:0} }
@keyframes ntg-count-in  { from{transform:translateY(6px);opacity:0} to{transform:translateY(0);opacity:1} }

.ntg-skel-light {
  background: linear-gradient(90deg, #e4e4e7 25%, #f4f4f5 50%, #e4e4e7 75%);
  background-size: 400% 100%;
  animation: ntg-shimmer 1.8s ease infinite;
  border-radius: 32px; position: relative; overflow: hidden;
}
.ntg-skel-dark {
  background: linear-gradient(90deg, #181818 25%, #232323 50%, #181818 75%);
  background-size: 400% 100%;
  animation: ntg-shimmer 1.8s ease infinite;
  border-radius: 32px; position: relative; overflow: hidden;
}
.ntg-skel-light::after, .ntg-skel-dark::after {
  content: '';
  position: absolute; inset: 0;
  background-image: radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px);
  background-size: 15px 15px;
  border-radius: inherit;
}
.dark .ntg-skel-light { display: none; }
.ntg-skel-dark { display: none; }
.dark .ntg-skel-dark { display: block; }

.ntg-tile:hover .ntg-media  { filter: grayscale(0%) brightness(1.02); transform: scale(1.06); }
.ntg-tile:hover .ntg-circuit{ opacity: 0; }
.ntg-tile:hover .ntg-scan   { opacity: 1; }
.ntg-tile:hover .ntg-glass  { opacity: 1; }
.ntg-tile:hover .ntg-livenode{ opacity: 1; }
.ntg-tile:hover .ntg-corner { opacity: 1; }

.ntg-media {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover; display: block;
  filter: grayscale(100%) brightness(0.80);
  transition: filter .55s cubic-bezier(.32,.72,0,1), transform .55s cubic-bezier(.32,.72,0,1);
}
.ntg-circuit {
  position: absolute; inset: 0;
  background-image: radial-gradient(circle, rgba(0,0,0,0.055) 1px, transparent 1px);
  background-size: 13px 13px;
  pointer-events: none; z-index: 1; transition: opacity .3s;
}
.dark .ntg-circuit {
  background-image: radial-gradient(circle, rgba(255,255,255,0.038) 1px, transparent 1px);
}
.ntg-scan {
  position: absolute; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255,0,0,0.55), transparent);
  animation: ntg-scan 2.6s linear infinite;
  pointer-events: none; z-index: 2; opacity: 0; transition: opacity .25s;
}
.ntg-glass {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.22) 52%, transparent 100%);
  display: flex; flex-direction: column; justify-content: flex-end;
  padding: 18px; opacity: 0; transition: opacity .22s ease; z-index: 3;
}
.ntg-livenode {
  position: absolute; top: 11px; left: 11px; z-index: 4;
  pointer-events: none;
  display: flex; align-items: center; gap: 5px;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255,0,0,0.25);
  border-radius: 8px; padding: 3px 8px;
  opacity: 0; transition: opacity .2s;
}
.ntg-live {
  width: 6px; height: 6px; border-radius: 50%;
  background: #FF0000; box-shadow: 0 0 6px rgba(255,0,0,0.65);
  animation: ntg-dot-blink 1.5s ease infinite;
  position: relative; flex-shrink: 0;
}
.ntg-live::after {
  content: ''; position: absolute; inset: 0;
  border-radius: 50%; background: #FF0000;
  animation: ntg-live-ping 1.5s ease infinite;
}
.ntg-corner {
  position: absolute; bottom: 0; right: 0;
  width: 0; height: 0; border-style: solid;
  border-width: 0 0 26px 26px;
  border-color: transparent transparent #FF0000 transparent;
  opacity: 0; transition: opacity .22s; z-index: 4;
}
.ntg-stat  { animation: ntg-count-in .18s ease both; }
.ntg-stat-2{ animation: ntg-count-in .18s ease .05s both; }
.ntg-tile-enter { animation: ntg-tile-in .32s cubic-bezier(.32,.72,0,1) both; }

/* ── Mobile: uniform 2-col grid instead of bento layout ── */
@media (max-width: 767px) {
  .ntg-bento-chunk-top {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    grid-template-rows: auto !important;
  }
  .ntg-bento-chunk-top > *:first-child {
    grid-column: auto !important;
    grid-row: auto !important;
    aspect-ratio: 1/1 !important;
  }
  .ntg-bento-featured { display: contents; }
}
`

function fmtCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 10_000) return `${(n / 1_000).toFixed(0)}K`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
}

const NothingLoader = () => (
    <div className="flex flex-col items-center justify-center py-16 gap-5">
        <div className="grid grid-cols-3 gap-[7px]">
            {[...Array(9)].map((_, i) => (
                <div key={i}
                    className={`w-[7px] h-[7px] rounded-full ${i === 4 ? "bg-red-600 shadow-[0_0_8px_rgba(255,0,0,0.5)]" : "bg-zinc-500 dark:bg-zinc-600"}`}
                    style={{ animation: "ntg-dot-blink 1.2s ease infinite", animationDelay: `${i * 0.09}s` }}
                />
            ))}
        </div>
        <p className="font-mono text-[9px] font-bold tracking-[0.5em] uppercase text-zinc-400 dark:text-zinc-500">
            FETCHING_DATA_PACKETS
        </p>
    </div>
)

const SectionHeader = ({ count }: { count: number }) => (
    <div className="flex items-center justify-between pb-4 mb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_6px_rgba(255,0,0,0.5)]"
                style={{ animation: "ntg-dot-blink 1.8s ease infinite" }} />
            <span className="font-mono text-[10px] font-bold tracking-[0.5em] uppercase text-zinc-600 dark:text-zinc-300">
                TRANSMISSIONS
            </span>
        </div>
        <span className="font-mono text-[9px] font-bold tracking-[0.3em] text-red-600">
            {String(count).padStart(3, "0")}
        </span>
    </div>
)

const SkeletonTile = ({ delay = 0, colSpan2 = false }: { delay?: number; colSpan2?: boolean }) => (
    <div
        className={`ntg-skel-light dark:ntg-skel-dark aspect-square ${colSpan2 ? "col-span-2 row-span-2" : ""}`}
        style={{ animationDelay: `${delay}s` }}
    />
)

export const PostGridSkeleton = () => (
    <>
        <style>{GCSS}</style>
        <div className="rounded-[40px] p-6 bg-zinc-50 dark:bg-[#0A0A0A] border border-zinc-200 dark:border-zinc-800 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none rounded-[inherit]"
                style={{ backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
            <div className="absolute top-0 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-40" />
            <div className="grid grid-cols-3 gap-2" style={{ gridAutoRows: "auto" }}>
                <SkeletonTile colSpan2 />
                {[0.09, 0.18, 0.27, 0.36].map((d, i) => <SkeletonTile key={i} delay={d} />)}
            </div>
        </div>
    </>
)

const PostTile = ({ post, index, featured = false, onClick }: {
    post: Post; index: number; featured?: boolean; onClick: () => void
}) => {
    const firstMedia = post.media[0]
    const isVideo = firstMedia?.type === "video"
    const isMulti = post.media.length > 1
    const statSz = featured ? 14 : 12

    return (
        <div
            className="ntg-tile relative overflow-hidden cursor-pointer rounded-[32px] w-full h-full
                       bg-zinc-100 dark:bg-[#111111]
                       border border-zinc-200/80 dark:border-white/[0.06]
                       transition-[border-color,box-shadow] duration-200
                       hover:border-zinc-400/60 dark:hover:border-white/[0.14]
                       hover:shadow-[0_0_0_1px_rgba(255,0,0,0.10),0_18px_48px_rgba(0,0,0,0.18)]
                       active:scale-[.965]"
            onClick={onClick}
            style={{ animationDelay: `${Math.min(index, 11) * 0.05}s` }}
        >
            <div className="ntg-circuit" />
            <div className="ntg-scan" />
            {isVideo
                ? <video src={`${firstMedia.url}#t=0.001`} muted playsInline preload="metadata" className="ntg-media" />
                : <img src={firstMedia?.url} alt={post.caption || "post"} loading="lazy" decoding="async" className="ntg-media" />
            }
            <div className="ntg-glass">
                <div className="flex items-end justify-between">
                    <div className="flex gap-4">
                        <div className="flex flex-col gap-1">
                            <span className="font-mono text-[8px] font-bold tracking-[0.4em] uppercase text-zinc-400">ENGAGE</span>
                            <div className="ntg-stat flex items-center gap-1.5">
                                <Heart size={statSz} fill="#FF0000" stroke="none" className="drop-shadow-[0_0_4px_rgba(255,0,0,0.5)]" />
                                <span className="font-mono font-bold text-white leading-none" style={{ fontSize: featured ? 15 : 13, letterSpacing: "0.06em" }}>
                                    {fmtCount(post.likesCount)}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="font-mono text-[8px] font-bold tracking-[0.4em] uppercase text-zinc-400">COMMS</span>
                            <div className="ntg-stat-2 flex items-center gap-1.5">
                                <MessageCircle size={statSz} fill="#888888" stroke="none" />
                                <span className="font-mono font-bold text-zinc-300 leading-none" style={{ fontSize: featured ? 15 : 13, letterSpacing: "0.06em" }}>
                                    {fmtCount(post.commentsCount)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="w-8 h-8 rounded-full border border-white/20 bg-white/[0.06] backdrop-blur flex items-center justify-center text-white/70">
                        <Eye size={12} />
                    </div>
                </div>
            </div>
            <div className="ntg-livenode">
                <div className="ntg-live" />
                <span className="font-mono text-[8px] font-bold tracking-[0.15em] text-red-500">LIVE_NODE</span>
            </div>
            <div className="absolute top-[11px] right-[11px] flex gap-1.5 z-[4] pointer-events-none">
                {isVideo && (
                    <div className="flex items-center gap-1 bg-black/65 backdrop-blur-md border border-white/[0.09] rounded-lg px-1.5 py-0.5 text-white/80">
                        <div className="ntg-live" />
                        <span className="font-mono text-[8px] tracking-[0.1em]">VID</span>
                    </div>
                )}
                {isMulti && !isVideo && (
                    <div className="flex items-center gap-1 bg-black/65 backdrop-blur-md border border-white/[0.09] rounded-lg px-1.5 py-0.5 text-white/80">
                        <Copy size={8} />
                        <span className="font-mono text-[8px] tracking-[0.1em]">{post.media.length}</span>
                    </div>
                )}
            </div>
            <div className="ntg-corner" />
        </div>
    )
}

const BentoGrid = ({ posts, loadingMore, onTileClick }: {
    posts: Post[]; loadingMore: boolean; onTileClick: (id: string) => void
}) => {
    const chunks: Post[][] = []
    for (let i = 0; i < posts.length; i += 7) chunks.push(posts.slice(i, i + 7))

    return (
        <div className="flex flex-col gap-2">
            {chunks.map((chunk, ci) => {
                const featured = chunk[0]
                const sideItems = chunk.slice(1, 5)
                const rowItems = chunk.slice(5)
                return (
                    <div key={ci} className="flex flex-col gap-2">
                        {/* Desktop: bento 2fr+1fr+1fr  |  Mobile: 2-col uniform */}
                        <div
                            className="ntg-bento-chunk-top grid gap-2"
                            style={{ gridTemplateColumns: "2fr 1fr 1fr", gridTemplateRows: "1fr 1fr" }}
                        >
                            <div className="ntg-tile-enter" style={{ gridColumn: "1/2", gridRow: "1/3", aspectRatio: "1/1", animationDelay: `${ci * 0.04}s` }}>
                                <PostTile post={featured} index={ci * 7} featured onClick={() => onTileClick(featured._id)} />
                            </div>
                            {sideItems.map((post, li) => (
                                <div key={post._id} className="ntg-tile-enter aspect-square" style={{ animationDelay: `${(ci * 7 + 1 + li) * 0.05}s` }}>
                                    <PostTile post={post} index={ci * 7 + 1 + li} onClick={() => onTileClick(post._id)} />
                                </div>
                            ))}
                            {Array.from({ length: Math.max(0, 4 - sideItems.length) }).map((_, pi) => (
                                <div key={`ph-${pi}`} className="aspect-square rounded-[32px] bg-zinc-100 dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-800 flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                </div>
                            ))}
                        </div>
                        {rowItems.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {rowItems.map((post, li) => (
                                    <div key={post._id} className="ntg-tile-enter aspect-square" style={{ animationDelay: `${(ci * 7 + 5 + li) * 0.05}s` }}>
                                        <PostTile post={post} index={ci * 7 + 5 + li} onClick={() => onTileClick(post._id)} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )
            })}
            {loadingMore && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="ntg-skel-light dark:ntg-skel-dark aspect-square" style={{ animationDelay: `${i * 0.1}s` }} />
                    ))}
                </div>
            )}
        </div>
    )
}

const EmptyState = () => (
    <div className="relative flex flex-col items-center justify-center py-20 px-8 gap-4 rounded-[40px] overflow-hidden
                    bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
        <div className="absolute inset-0 pointer-events-none rounded-[inherit]"
            style={{ backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px)", backgroundSize: "14px 14px" }} />
        <div className="relative w-14 h-14 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
            <div className="grid grid-cols-4 gap-[3px] p-2.5">
                {[1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1].map((on, i) => (
                    <div key={i} className={`w-1 h-1 rounded-full ${on ? "bg-zinc-400" : "bg-transparent"}`} />
                ))}
            </div>
        </div>
        <div className="relative text-center">
            <p className="font-mono text-[11px] font-bold tracking-[0.45em] uppercase text-zinc-900 dark:text-zinc-100 mb-2">ZERO_TRANSMISSIONS</p>
            <p className="text-[13px] text-zinc-500 leading-relaxed max-w-[240px] text-center">No valid data packets found in this sector</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-50" />
    </div>
)

const LoadMoreDots = () => (
    <div className="flex items-center justify-center gap-[7px] py-5">
        {[0, 1, 2].map(i => (
            <div key={i}
                className={`w-1.5 h-1.5 rounded-full ${i === 1 ? "bg-red-600 shadow-[0_0_6px_rgba(255,0,0,0.5)]" : "bg-zinc-400 dark:bg-zinc-600"}`}
                style={{ animation: "ntg-dot-blink 1s ease infinite", animationDelay: `${i * 0.2}s` }}
            />
        ))}
    </div>
)

/* ═══ MAIN ═══════════════════════════════════════════════════════ */
export default function PostGrid({ userId }: PostGridProps) {
    const router = useRouter()
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [cursor, setCursor] = useState<string | undefined>()
    const [hasMore, setHasMore] = useState(true)
    const observerRef = useRef<IntersectionObserver | null>(null)
    const sentinelRef = useRef<HTMLDivElement | null>(null)

    const fetchPosts = useCallback(async (nextCursor?: string) => {
        const cacheKey = postCacheKey(userId, nextCursor)
        const isFirst = !nextCursor

        try {
            // 1. Show stale data instantly on first load
            if (isFirst) {
                const stale = cache.getStale<{ posts: Post[]; cursor?: string }>(cacheKey)
                if (stale) {
                    setPosts(stale.posts)
                    setCursor(stale.cursor)
                    setHasMore(!!stale.cursor)
                    setLoading(false)
                    // Still fetch fresh in background (don't return early)
                }
            }

            // 2. Fetch fresh data
            const res = await getUserPosts(userId, nextCursor)
            const { posts: newPosts, nextCusor } = res.data.data

            // 3. Store in localStorage
            cache.set(cacheKey, { posts: newPosts, cursor: nextCusor ?? undefined }, TTL.POSTS_PAGE)

            // 4. Update UI
            setPosts(prev => nextCursor ? [...prev, ...newPosts] : newPosts)
            setCursor(nextCusor ?? undefined)
            setHasMore(!!nextCusor)
        } catch {
            setHasMore(false)
        }
    }, [userId])

    useEffect(() => {
        setLoading(true)
        setPosts([])
        setCursor(undefined)
        setHasMore(true)
        fetchPosts().finally(() => setLoading(false))
    }, [userId, fetchPosts])

    useEffect(() => {
        if (!hasMore || loadingMore) return
        observerRef.current = new IntersectionObserver(async ([entry]) => {
            if (!entry.isIntersecting) return
            setLoadingMore(true)
            await fetchPosts(cursor)
            setLoadingMore(false)
        }, { threshold: 0.1 })
        if (sentinelRef.current) observerRef.current.observe(sentinelRef.current)
        return () => observerRef.current?.disconnect()
    }, [cursor, hasMore, loadingMore, fetchPosts])

    // loading=true only when there's no stale data to show
    const showSkeleton = loading && posts.length === 0
    return (
        <>
            <style>{GCSS}</style>

            {/* Main Bento Container — soft squircle preserved */}
            <div className="relative rounded-[48px] p-5 md:p-10 overflow-hidden bg-white dark:bg-[#0D0D0D] border border-zinc-200 dark:border-zinc-800 transition-all duration-500 shadow-lg dark:shadow-2xl">

                {/* Dot Matrix — light */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-[0.04] dark:hidden"
                    style={{
                        backgroundImage: "radial-gradient(circle, rgba(0,0,0,1) 1px, transparent 1px)",
                        backgroundSize: "12px 12px",
                    }}
                />
                {/* Dot Matrix — dark */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-[0.055] hidden dark:block"
                    style={{
                        backgroundImage: "radial-gradient(circle, rgba(255,255,255,1) 1px, transparent 1px)",
                        backgroundSize: "12px 12px",
                    }}
                />

                {/* Red accent lines — kept exactly as-is */}
                <div className="absolute top-0 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-[#FF0000]/40 to-transparent" />
                <div className="absolute bottom-0 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-[#FF0000]/20 to-transparent" />

                <div className="relative z-10">
                    {/* 1. Loading State */}
                    {showSkeleton && (
                        <div className="space-y-8">
                            <div className="flex items-center gap-3 opacity-40">
                                <div className="w-2 h-2 rounded-full bg-[#FF0000] animate-pulse" />
                                <span className="text-[8px] font-bold uppercase tracking-[0.3em] dark:text-white">Retrieving_Data...</span>
                            </div>
                            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(3,1fr)", gridAutoRows: "auto" }}>
                                <div className="ntg-skel-light dark:ntg-skel-dark rounded-[32px] aspect-square hidden md:block" style={{ gridColumn: "1/3", gridRow: "1/3" }} />
                                <div className="ntg-skel-light dark:ntg-skel-dark rounded-[32px] aspect-square md:hidden col-span-2" />
                                {[0, 1, 2, 3, 4].map(i => (
                                    <div key={i} className="ntg-skel-light dark:ntg-skel-dark rounded-[24px] aspect-square" style={{ animationDelay: `${i * 0.1}s` }} />
                                ))}
                            </div>
                            <NothingLoader />
                        </div>
                    )}

                    {/* 2. Empty State */}
                    {!showSkeleton && posts.length === 0 && (
                        <div className="py-20">
                            <EmptyState />
                        </div>
                    )}

                    {/* 3. Grid */}
                    {posts.length > 0 && (
                        <div className="space-y-10">
                            <div className="flex items-end justify-between border-b border-zinc-100 dark:border-zinc-900 pb-6">
                                <SectionHeader count={posts.length} />
                                <div className="text-[8px] font-bold uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-500">
                                    Archive_v3.0
                                </div>
                            </div>

                            <BentoGrid
                                posts={posts}
                                loadingMore={loadingMore}
                                onTileClick={(id) => router.push(`/posts/${id}`)}
                            />
                        </div>
                    )}

                    {/* 4. Infinite Scroll Indicator */}
                    {loadingMore && (
                        <div className="mt-12 py-6 border-t border-zinc-100 dark:border-zinc-900 flex justify-center">
                            <LoadMoreDots />
                        </div>
                    )}
                </div>

                {/* Observer Sentinel */}
                <div ref={sentinelRef} className="h-4 w-full" aria-hidden />
            </div>

        </>
    )
}