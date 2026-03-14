"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, Play, Pause, VolumeX, Volume2, Loader, Film } from "lucide-react";
import { getReelsFeed, type FeedPost } from "../../../src/lib/api/feedApi";
import { toggleLike } from "../../../src/lib/api/postApi";
import { cache } from "../../../src/lib/cache";

const CACHE_TTL = 3 * 60_000; // 3 min
const reelsCacheKey = (cursor?: string) => `feed:reels:${cursor ?? "first"}`;

// ─── Single Reel ──────────────────────────────────────────────────────────────
function ReelItem({ reel, isActive }: { reel: FeedPost; isActive: boolean }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(false);
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(reel.likesCount);
    const [liking, setLiking] = useState(false);
    const [showPlayIndicator, setShowPlayIndicator] = useState(false);
    const indicatorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const media = reel.media?.[0];

    useEffect(() => {
        const vid = videoRef.current;
        if (!vid) return;
        if (isActive) {
            vid.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
        } else {
            vid.pause();
            vid.currentTime = 0;
            setPlaying(false);
        }
    }, [isActive]);

    const togglePlay = () => {
        const vid = videoRef.current;
        if (!vid) return;
        if (playing) { vid.pause(); setPlaying(false); }
        else { vid.play().then(() => setPlaying(true)).catch(() => {}); }
        setShowPlayIndicator(true);
        if (indicatorTimer.current) clearTimeout(indicatorTimer.current);
        indicatorTimer.current = setTimeout(() => setShowPlayIndicator(false), 1200);
    };

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (liking) return;
        setLiking(true);
        const wasLiked = liked;
        setLiked(!wasLiked);
        setLikeCount(prev => wasLiked ? prev - 1 : prev + 1);
        try { await toggleLike(reel._id, "Post"); }
        catch {
            setLiked(wasLiked);
            setLikeCount(prev => wasLiked ? prev + 1 : prev - 1);
        } finally { setLiking(false); }
    };

    return (
        <div className="w-full h-screen bg-zinc-950 flex items-center justify-center">
            <div className="flex items-end gap-3" style={{ height: "min(calc(100vh - 32px), 780px)" }}>

                {/* Video box */}
                <div
                    className="relative bg-black overflow-hidden flex-shrink-0"
                    style={{ aspectRatio: "9/16", height: "100%", maxWidth: "calc((min(calc(100vh - 32px), 780px)) * 9 / 16)", borderRadius: 12 }}
                    onClick={togglePlay}
                >
                    {media?.url ? (
                        <video ref={videoRef} src={media.url} className="w-full h-full object-cover cursor-pointer" loop muted={muted} playsInline preload="metadata" />
                    ) : (
                        <div className="w-full h-full bg-zinc-900 flex items-center justify-center cursor-pointer">
                            <Film size={32} className="text-zinc-700" />
                        </div>
                    )}

                    <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${showPlayIndicator ? "opacity-100" : "opacity-0"}`}>
                        <div className="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                            {playing ? <Play size={22} fill="white" className="text-white ml-1" /> : <Pause size={22} fill="white" className="text-white" />}
                        </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 100%)" }} />
                    <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
                        <Link href={`/profile/${reel.author.username}`} className="inline-flex items-center gap-2 mb-2 pointer-events-auto" onClick={e => e.stopPropagation()}>
                            <div className="w-7 h-7 rounded-full overflow-hidden border border-white/30 bg-zinc-800 shrink-0 flex items-center justify-center">
                                {reel.author.profilePicture ? (
                                    <Image src={reel.author.profilePicture} alt={reel.author.username} width={28} height={28} className="w-full h-full object-cover" unoptimized />
                                ) : (
                                    <span className="text-[9px] font-black text-white uppercase">{reel.author.username.slice(0, 2)}</span>
                                )}
                            </div>
                            <span className="text-[12px] font-bold text-white drop-shadow">{reel.author.username}</span>
                        </Link>
                        {reel.caption && <p className="text-[11px] text-white/80 leading-relaxed line-clamp-2">{reel.caption}</p>}
                    </div>
                </div>

                {/* Action bar */}
                <div className="flex flex-col items-center gap-5 pb-6">
                    <button onClick={handleLike} disabled={liking} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
                        <Heart size={26} strokeWidth={liked ? 0 : 1.5} fill={liked ? "#ef4444" : "none"} className={liked ? "text-red-500" : "text-white"} />
                        <span className="text-[10px] font-black text-white tabular-nums">{likeCount}</span>
                    </button>
                    <Link href={`/posts/${reel._id}`} className="flex flex-col items-center gap-1" onClick={e => e.stopPropagation()}>
                        <MessageCircle size={26} strokeWidth={1.5} className="text-white" />
                        <span className="text-[10px] font-black text-white tabular-nums">{reel.commentsCount}</span>
                    </Link>
                    <button onClick={e => { e.stopPropagation(); setMuted(m => !m); }} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
                        {muted ? <VolumeX size={24} strokeWidth={1.5} className="text-white" /> : <Volume2 size={24} strokeWidth={1.5} className="text-white" />}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Cached fetch helper ──────────────────────────────────────────────────────
interface ReelsPage { reels: FeedPost[]; nextCursor: string | null; }

async function fetchReelsPage(cursor?: string): Promise<ReelsPage> {
    const key = reelsCacheKey(cursor);
    // Serve from cache if fresh
    const cached = cache.get<ReelsPage>(key);
    if (cached) return cached;

    const res = await getReelsFeed(cursor);
    const { reels, nextCursor } = res.data.data;
    const page: ReelsPage = {
        reels: Array.isArray(reels) ? reels : [],
        nextCursor: nextCursor ?? null,
    };
    cache.set(key, page, CACHE_TTL);
    return page;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ReelsPage() {
    const [reels, setReels] = useState<FeedPost[]>([]);
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const fetchedRef = useRef(false);

    const loadFirstPage = useCallback(async () => {
        try {
            // Show stale first page instantly if available
            const stale = cache.getStale<ReelsPage>(reelsCacheKey());
            if (stale?.reels.length) {
                setReels(stale.reels);
                setCursor(stale.nextCursor);
                setHasMore(!!stale.nextCursor);
                setLoading(false);
            }
            // Always fetch fresh in background
            const page = await fetchReelsPage();
            setReels(page.reels);
            setCursor(page.nextCursor);
            setHasMore(!!page.nextCursor);
        } catch {
            setError("Failed to load reels.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (fetchedRef.current) return;
        fetchedRef.current = true;
        loadFirstPage();
    }, [loadFirstPage]);

    // Intersection observer — track active reel + trigger load-more
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const slides = container.querySelectorAll<HTMLElement>("[data-reel-index]");
        if (!slides.length) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    const idx = Number((entry.target as HTMLElement).dataset.reelIndex);
                    setActiveIndex(idx);
                    if (idx >= reels.length - 3 && hasMore && !loadingMore) {
                        setLoadingMore(true);
                        fetchReelsPage(cursor ?? undefined)
                            .then(page => {
                                setReels(prev => [...prev, ...page.reels]);
                                setCursor(page.nextCursor);
                                setHasMore(!!page.nextCursor);
                            })
                            .catch(() => {})
                            .finally(() => setLoadingMore(false));
                    }
                });
            },
            { threshold: 0.6 }
        );
        slides.forEach(slide => observer.observe(slide));
        return () => observer.disconnect();
    }, [reels.length, cursor, hasMore, loadingMore]);

    const retry = () => {
        cache.invalidate(reelsCacheKey());
        fetchedRef.current = false;
        setError(null);
        setLoading(true);
        loadFirstPage();
    };

    if (loading && reels.length === 0) return (
        <div className="h-screen bg-zinc-950 flex items-center justify-center">
            <Loader size={20} className="text-zinc-600 animate-spin" />
        </div>
    );

    if (error) return (
        <div className="h-screen bg-zinc-950 flex flex-col items-center justify-center gap-3">
            <p className="text-[11px] text-red-400 font-medium">{error}</p>
            <button onClick={retry} className="text-[9px] font-bold tracking-[0.2em] uppercase border border-zinc-700 px-4 py-2 text-white hover:border-white transition-colors">Retry</button>
        </div>
    );

    if (reels.length === 0) return (
        <div className="h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center">
                <Film size={18} strokeWidth={1.5} className="text-zinc-600" />
            </div>
            <div className="text-center">
                <p className="text-[13px] font-semibold text-zinc-200">No reels yet</p>
                <p className="text-[11px] text-zinc-600 mt-1">Check back soon</p>
            </div>
        </div>
    );

    return (
        <div className="relative h-screen bg-zinc-950 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 z-30 px-6 pt-5 pointer-events-none flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Film size={12} className="text-white/30" strokeWidth={1.5} />
                    <span className="text-[8px] font-bold tracking-[0.3em] uppercase text-white/30">Reels</span>
                </div>
                <span className="text-[9px] font-black text-white/25 tabular-nums tracking-widest">{activeIndex + 1} / {reels.length}</span>
            </div>

            <div ref={containerRef} className="h-full overflow-y-scroll no-scrollbar" style={{ scrollSnapType: "y mandatory" }}>
                {reels.map((reel, i) => (
                    <div key={reel._id} data-reel-index={i} className="w-full h-screen" style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}>
                        <ReelItem reel={reel} isActive={activeIndex === i} />
                    </div>
                ))}

                {loadingMore && (
                    <div className="w-full h-screen bg-zinc-950 flex items-center justify-center" style={{ scrollSnapAlign: "start" }}>
                        <Loader size={18} className="text-zinc-700 animate-spin" />
                    </div>
                )}

                {!hasMore && !loadingMore && reels.length > 0 && (
                    <div className="w-full h-screen bg-zinc-950 flex flex-col items-center justify-center gap-3" style={{ scrollSnapAlign: "start" }}>
                        <div className="h-px w-12 bg-zinc-800" />
                        <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-zinc-700">All reels watched</p>
                    </div>
                )}
            </div>
        </div>
    );
}