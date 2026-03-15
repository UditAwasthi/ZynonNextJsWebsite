"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Heart, MessageCircle, Copy } from "lucide-react"

interface PostGridItem {
    _id: string
    media: { url: string; type: "image" | "video" }[]
    caption?: string
    likesCount: number
    commentsCount: number
    visibility: string
    createdAt: string
}

interface PublicPostsGridProps {
    userId: string
    isPrivate?: boolean
    username?: string
}

const gridCache = new Map<string, { posts: PostGridItem[]; cursor: string | null; ts: number }>()
const CACHE_TTL = 2 * 60 * 1000

const GCSS = `
@keyframes ntg-shimmer   { from{background-position:200% 0} to{background-position:-200% 0} }
@keyframes ntg-tile-in   { from{opacity:0;transform:scale(.94) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
@keyframes ntg-dot-blink { 0%,100%{opacity:1} 50%{opacity:0.12} }
@keyframes ntg-scan      { 0%{transform:translateY(-100%)} 100%{transform:translateY(500%)} }
@keyframes ntg-live-ping { 0%{transform:scale(1);opacity:0.8} 100%{transform:scale(2.4);opacity:0} }
@keyframes ntg-pulse-ring{ 0%,100%{box-shadow:0 0 0 0 rgba(255,0,0,0)} 50%{box-shadow:0 0 0 5px rgba(255,0,0,0.2)} }
@keyframes ntg-count-in  { from{transform:translateY(6px);opacity:0} to{transform:translateY(0);opacity:1} }

/* ── Skeleton — dual theme ── */
.ntg-skel {
  border-radius: 32px; position: relative; overflow: hidden;
  background: linear-gradient(90deg, #e4e4e7 25%, #f4f4f5 50%, #e4e4e7 75%);
  background-size: 400% 100%;
  animation: ntg-shimmer 1.8s ease infinite;
}
.dark .ntg-skel {
  background: linear-gradient(90deg, #181818 25%, #232323 50%, #181818 75%);
  background-size: 400% 100%;
}
.ntg-skel::after {
  content: ''; position: absolute; inset: 0; border-radius: inherit;
  background-image: radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px);
  background-size: 12px 12px;
}
.dark .ntg-skel::after {
  background-image: radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px);
}

/* ── Tile child-combinator hovers ── */
.ntg-tile:hover .ntg-media   { filter: grayscale(0%) brightness(1.02); transform: scale(1.06); }
.ntg-tile:hover .ntg-circuit { opacity: 0; }
.ntg-tile:hover .ntg-scan    { opacity: 1; }
.ntg-tile:hover .ntg-glass   { opacity: 1; }
.ntg-tile:hover .ntg-idx     { opacity: 1; }
.ntg-tile:hover .ntg-corner  { opacity: 1; }

/* ── Media base ── */
.ntg-media {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; display: block;
  filter: grayscale(100%) brightness(0.80);
  transition: filter .55s cubic-bezier(.32,.72,0,1), transform .55s cubic-bezier(.32,.72,0,1);
}

/* ── Circuit dot-grid — light ── */
.ntg-circuit {
  position: absolute; inset: 0;
  background-image: radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px);
  background-size: 12px 12px;
  pointer-events: none; z-index: 1; transition: opacity .3s;
}
.dark .ntg-circuit {
  background-image: radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px);
}

/* ── Scan line ── */
.ntg-scan {
  position: absolute; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255,0,0,0.55), transparent);
  animation: ntg-scan 2.8s linear infinite;
  pointer-events: none; z-index: 2; opacity: 0; transition: opacity .25s;
}

/* ── Glass overlay ── */
.ntg-glass {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.25) 50%, transparent 100%);
  display: flex; flex-direction: column; justify-content: flex-end;
  padding: 18px; opacity: 0; transition: opacity .22s ease; z-index: 3;
}

/* ── Index chip ── */
.ntg-idx {
  position: absolute; top: 11px; left: 11px; z-index: 4;
  pointer-events: none;
  background: rgba(0,0,0,0.55); backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 6px; padding: 2px 7px;
  opacity: 0; transition: opacity .18s;
}

/* ── Red live dot + ping ── */
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

/* ── Red corner triangle ── */
.ntg-corner {
  position: absolute; bottom: 0; right: 0;
  width: 0; height: 0; border-style: solid;
  border-width: 0 0 26px 26px;
  border-color: transparent transparent #FF0000 transparent;
  opacity: 0; transition: opacity .22s; z-index: 4;
}

/* ── Private wall lock ring pulse ── */
.ntg-lock { animation: ntg-pulse-ring 2.4s ease infinite; }

/* ── Stat entrance ── */
.ntg-stat  { animation: ntg-count-in .18s ease both; }
.ntg-stat2 { animation: ntg-count-in .18s ease .05s both; }

/* ── Tile entrance ── */
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
}
`

function fmtCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 10_000)    return `${(n / 1_000).toFixed(0)}K`
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
    return String(n)
}

const NothingLoader = () => (
    <div className="flex flex-col items-center justify-center py-16 gap-5">
        <div className="grid grid-cols-3 gap-[7px]">
            {[...Array(9)].map((_, i) => (
                <div
                    key={i}
                    className={`w-[7px] h-[7px] rounded-full ${i === 4 ? "bg-red-600 shadow-[0_0_8px_rgba(255,0,0,0.5)]" : "bg-zinc-400 dark:bg-zinc-600"}`}
                    style={{ animation: "ntg-dot-blink 1.2s ease infinite", animationDelay: `${i * 0.09}s` }}
                />
            ))}
        </div>
        <p className="font-mono text-[9px] font-bold tracking-[0.5em] uppercase text-zinc-400 dark:text-zinc-500">
            LOADING_DATA
        </p>
    </div>
)

const SectionHeader = ({ count }: { count: number }) => (
    <div className="flex items-center justify-between pb-4 mb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_6px_rgba(255,0,0,0.5)]"
                style={{ animation: "ntg-dot-blink 1.8s ease infinite" }} />
            <span className="font-mono text-[8px] font-bold tracking-[0.3em] uppercase text-zinc-500 dark:text-zinc-400">
                TRANSMISSIONS
            </span>
        </div>
        <span className="font-mono text-[9px] font-bold tracking-[0.3em] text-red-600">
            {String(count).padStart(3, "0")}
        </span>
    </div>
)

const SkeletonGrid = () => (
    <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(3,1fr)", gridAutoRows: "auto" }}>
        <div className="ntg-skel aspect-square hidden md:block" style={{ gridColumn: "1/3", gridRow: "1/3" }} />
        <div className="ntg-skel aspect-square md:hidden col-span-2" />
        {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="ntg-skel aspect-square" style={{ animationDelay: `${i * 0.09}s` }} />
        ))}
    </div>
)

async function fetchUserPosts(userId: string, cursor?: string): Promise<{ posts: PostGridItem[]; nextCusor: string | null }> {
    const base  = process.env.NEXT_PUBLIC_API_BASE || "https://zynon.onrender.com/api/"
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null
    const url   = new URL(`${base}content/user/${userId}/posts`)
    if (cursor) url.searchParams.set("cursor", cursor)
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (token) headers["Authorization"] = `Bearer ${token}`
    const res = await fetch(url.toString(), { headers })
    if (!res.ok) throw new Error(`${res.status}`)
    const json = await res.json()
    return { posts: json.data.posts ?? [], nextCusor: json.data.nextCusor ?? null }
}

const PostTile = ({
    post, index, featured = false, onClick,
}: {
    post: PostGridItem; index: number; featured?: boolean; onClick: () => void
}) => {
    const firstMedia = post.media[0]
    const isVideo    = firstMedia?.type === "video"
    const isMulti    = post.media.length > 1
    const statSz     = featured ? 14 : 12

    return (
        <div
            className="ntg-tile relative overflow-hidden cursor-pointer rounded-[32px] w-full h-full
                       bg-zinc-100 dark:bg-[#111111]
                       border border-zinc-200/80 dark:border-white/[0.06]
                       transition-[border-color,box-shadow] duration-200
                       hover:border-zinc-400/60 dark:hover:border-white/[0.14]
                       hover:shadow-[0_0_0_1px_rgba(255,0,0,0.08),0_16px_40px_rgba(0,0,0,0.12)]
                       dark:hover:shadow-[0_0_0_1px_rgba(255,0,0,0.10),0_20px_48px_rgba(0,0,0,0.70)]
                       active:scale-[.97]"
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
                <div className="flex items-center gap-3.5">
                    <div className="ntg-stat flex items-center gap-1.5">
                        <Heart size={statSz} fill="#FF0000" stroke="none" className="drop-shadow-[0_0_4px_rgba(255,0,0,0.5)]" />
                        <span className="font-mono font-bold text-white leading-none"
                            style={{ fontSize: featured ? 15 : 13, letterSpacing: "0.06em" }}>
                            {fmtCount(post.likesCount)}
                        </span>
                    </div>
                    <div className="ntg-stat2 flex items-center gap-1.5">
                        <MessageCircle size={statSz} fill="#888888" stroke="none" />
                        <span className="font-mono font-bold text-zinc-300 leading-none"
                            style={{ fontSize: featured ? 15 : 13, letterSpacing: "0.06em" }}>
                            {fmtCount(post.commentsCount)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="ntg-idx">
                <span className="font-mono text-[8px] font-bold tracking-[0.15em] text-zinc-300">
                    #{String(index + 1).padStart(2, "0")}
                </span>
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

const BentoGrid = ({
    posts, loadingMore, onTileClick,
}: {
    posts: PostGridItem[]; loadingMore: boolean; onTileClick: (id: string) => void
}) => {
    const chunks: PostGridItem[][] = []
    for (let i = 0; i < posts.length; i += 7) chunks.push(posts.slice(i, i + 7))

    return (
        <div className="flex flex-col gap-2">
            {chunks.map((chunk, ci) => {
                const featured  = chunk[0]
                const sideItems = chunk.slice(1, 5)
                const rowItems  = chunk.slice(5)

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
                                <div key={`ph-${pi}`} className="aspect-square rounded-[32px]
                                                                   bg-zinc-100 dark:bg-zinc-900
                                                                   border border-dashed border-zinc-300 dark:border-zinc-800
                                                                   flex items-center justify-center">
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
                        <div key={i} className="ntg-skel aspect-square" style={{ animationDelay: `${i * 0.1}s` }} />
                    ))}
                </div>
            )}
        </div>
    )
}

const EmptyState = () => (
    <div className="relative flex flex-col items-center justify-center py-20 px-8 gap-4 rounded-[40px] overflow-hidden
                    bg-white dark:bg-[#0D0D0D]
                    border border-zinc-200 dark:border-zinc-800">
        {/* Dot Matrix — light */}
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] dark:hidden"
            style={{ backgroundImage: "radial-gradient(circle, rgba(0,0,0,1) 1px, transparent 1px)", backgroundSize: "12px 12px", opacity: 0.04 }} />
        {/* Dot Matrix — dark */}
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] hidden dark:block"
            style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,1) 1px, transparent 1px)", backgroundSize: "12px 12px", opacity: 0.055 }} />

        <div className="relative w-14 h-14 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
            <div className="grid grid-cols-4 gap-[3px] p-2.5">
                {[1,1,1,1, 1,0,0,1, 1,0,0,1, 1,1,1,1].map((on, i) => (
                    <div key={i} className={`w-1 h-1 rounded-full ${on ? "bg-zinc-400 dark:bg-zinc-400" : "bg-transparent"}`} />
                ))}
            </div>
        </div>

        <div className="relative text-center">
            <p className="font-mono text-[8px] font-bold tracking-[0.3em] uppercase text-zinc-400 dark:text-zinc-500 mb-2">
                NULL_TRANSMISSIONS
            </p>
            <p className="text-[13px] text-zinc-500 dark:text-zinc-500 leading-relaxed max-w-[220px] text-center">
                No data packets found in this sector.
            </p>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF0000]/40 to-transparent" />
    </div>
)

const PrivateWall = ({ username }: { username?: string }) => (
    <div className="relative flex flex-col items-center justify-center py-20 px-8 gap-5 rounded-[40px] overflow-hidden
                    bg-white dark:bg-[#0D0D0D]
                    border border-zinc-200 dark:border-zinc-800">
        {/* Dot Matrix — light */}
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] dark:hidden"
            style={{ backgroundImage: "radial-gradient(circle, rgba(0,0,0,1) 1px, transparent 1px)", backgroundSize: "12px 12px", opacity: 0.04 }} />
        {/* Dot Matrix — dark */}
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] hidden dark:block"
            style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,1) 1px, transparent 1px)", backgroundSize: "12px 12px", opacity: 0.055 }} />

        <div className="ntg-lock relative w-16 h-16 rounded-[20px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                className="text-red-600 drop-shadow-[0_0_6px_rgba(255,0,0,0.4)]"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
        </div>

        <div className="relative text-center">
            <p className="font-mono text-[8px] font-bold tracking-[0.3em] uppercase text-zinc-400 dark:text-zinc-500 mb-2.5">
                ACCESS_RESTRICTED
            </p>
            <p className="text-[14px] text-zinc-500 dark:text-zinc-500 leading-relaxed max-w-[260px] text-center">
                {username ? (
                    <><span className="font-semibold text-zinc-800 dark:text-zinc-200">@{username}</span> has locked their transmissions. Send a follow request to gain access.</>
                ) : (
                    "This account is private. Follow to view transmissions."
                )}
            </p>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF0000]/40 to-transparent" />
    </div>
)

const LoadMoreDots = () => (
    <div className="flex items-center justify-center gap-[7px] py-5">
        {[0, 1, 2].map(i => (
            <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${i === 1 ? "bg-red-600 shadow-[0_0_6px_rgba(255,0,0,0.5)]" : "bg-zinc-400 dark:bg-zinc-600"}`}
                style={{ animation: "ntg-dot-blink 1s ease infinite", animationDelay: `${i * 0.2}s` }}
            />
        ))}
    </div>
)

export default function PublicPostsGrid({ userId, isPrivate = false, username }: PublicPostsGridProps) {
    const router = useRouter()
    const [posts,       setPosts]       = useState<PostGridItem[]>([])
    const [cursor,      setCursor]      = useState<string | null>(null)
    const [hasMore,     setHasMore]     = useState(false)
    const [loading,     setLoading]     = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const sentinelRef = useRef<HTMLDivElement>(null)

    const fetchPage = useCallback(async (cur?: string) => {
        if (!userId) return                              // ← never fire with undefined userId
        const isFirst = !cur
        isFirst ? setLoading(true) : setLoadingMore(true)
        const cacheKey = `pub:${userId}:${cur ?? ""}`
        const cached   = gridCache.get(cacheKey)
        if (cached && Date.now() - cached.ts < CACHE_TTL) {
            setPosts(p => isFirst ? cached.posts : [...p, ...cached.posts])
            setCursor(cached.cursor); setHasMore(!!cached.cursor)
            isFirst ? setLoading(false) : setLoadingMore(false)
            return
        }
        try {
            const { posts: newPosts, nextCusor } = await fetchUserPosts(userId, cur)
            gridCache.set(cacheKey, { posts: newPosts, cursor: nextCusor, ts: Date.now() })
            setPosts(p => isFirst ? newPosts : [...p, ...newPosts])
            setCursor(nextCusor); setHasMore(!!nextCusor)
        } catch { /* degrade silently */ }
        finally { isFirst ? setLoading(false) : setLoadingMore(false) }
    }, [userId])

    useEffect(() => {
        if (!userId) return                              // ← guard: wait until userId is defined
        if (isPrivate) { setLoading(false); return }
        setPosts([]); setCursor(null); setHasMore(false)
        fetchPage()
    }, [userId, isPrivate, fetchPage])

    useEffect(() => {
        if (!sentinelRef.current) return
        const obs = new IntersectionObserver(
            entries => { if (entries[0].isIntersecting && hasMore && !loadingMore) fetchPage(cursor ?? undefined) },
            { rootMargin: "400px" }
        )
        obs.observe(sentinelRef.current)
        return () => obs.disconnect()
    }, [hasMore, loadingMore, cursor, fetchPage])

    return (
        <>
            <style>{GCSS}</style>

            {/* ── Outer container ── */}
            <div className="relative rounded-[40px] p-4 md:p-6 overflow-hidden bg-white dark:bg-[#0D0D0D] border border-zinc-200 dark:border-zinc-800">

                {/* Dot Matrix — light */}
                <div className="absolute inset-0 pointer-events-none rounded-[inherit] dark:hidden"
                    style={{ backgroundImage: "radial-gradient(circle, rgba(0,0,0,1) 1px, transparent 1px)", backgroundSize: "12px 12px", opacity: 0.04 }} />
                {/* Dot Matrix — dark */}
                <div className="absolute inset-0 pointer-events-none rounded-[inherit] hidden dark:block"
                    style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,1) 1px, transparent 1px)", backgroundSize: "12px 12px", opacity: 0.055 }} />

                {/* Red top-edge accent */}
                <div className="absolute top-0 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-[#FF0000]/40 to-transparent" />

                <div className="relative">
                    {!loading && !isPrivate && <SectionHeader count={posts.length} />}
                    {isPrivate && <PrivateWall username={username} />}
                    {!isPrivate && loading && <><SkeletonGrid /><NothingLoader /></>}
                    {!isPrivate && !loading && posts.length === 0 && <EmptyState />}
                    {!isPrivate && posts.length > 0 && (
                        <BentoGrid posts={posts} loadingMore={loadingMore} onTileClick={(id) => router.push(`/posts/${id}`)} />
                    )}
                    {!isPrivate && loadingMore && <LoadMoreDots />}
                </div>

                {!isPrivate && <div ref={sentinelRef} className="h-px mt-2" aria-hidden />}

                {/* Red bottom-edge accent */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF0000]/30 to-transparent" />
            </div>
        </>
    )
}