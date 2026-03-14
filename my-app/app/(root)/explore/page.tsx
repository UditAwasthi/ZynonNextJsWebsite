"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Compass, Play, ChevronUp, ChevronDown } from "lucide-react";
import { getExploreFeed, type FeedPost } from "../../../src/lib/api/feedApi";
import PostModal from "../../../src/components/profile/PostModal";
import { cache, swr } from "../../../src/lib/cache";

const CACHE_KEY = "feed:explore";
const CACHE_TTL = 2 * 60_000; // 2 min

// ─── Video Thumbnail ──────────────────────────────────────────────────────────
function VideoCard({ post }: { post: FeedPost }) {
    const media = post.media[0];
    const videoRef = useRef<HTMLVideoElement>(null);
    const [frameReady, setFrameReady] = useState(false);

    useEffect(() => {
        const vid = videoRef.current;
        if (!vid) return;
        const onLoaded = () => { vid.currentTime = 0.5; vid.pause(); setFrameReady(true); };
        if (vid.readyState >= 2) { vid.currentTime = 0.5; vid.pause(); setFrameReady(true); }
        else vid.addEventListener("loadeddata", onLoaded, { once: true });
    }, []);

    return (
        <div className="relative w-full h-full overflow-hidden" style={{ aspectRatio: "1/1" }}>
            {!frameReady && (
                <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
                    <Play size={20} className="text-zinc-600" fill="currentColor" />
                </div>
            )}
            <video
                ref={videoRef}
                src={media.url}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${frameReady ? "opacity-100" : "opacity-0"}`}
                muted playsInline preload="metadata"
            />
            <div className="absolute top-2 right-2 z-10">
                <Play size={11} fill="white" className="text-white drop-shadow" />
            </div>
        </div>
    );
}

// ─── Grid Card ────────────────────────────────────────────────────────────────
function ExploreCard({
    post, focused, cardRef, onClick,
}: {
    post: FeedPost;
    focused: boolean;
    cardRef?: (el: HTMLDivElement | null) => void;
    onClick: () => void;
}) {
    const [hovered, setHovered] = useState(false);
    const media = post.media?.[0];
    const isVideo = media?.type === "video";
    const highlighted = focused || hovered;

    return (
        <div
            ref={cardRef}
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className={`relative block overflow-hidden bg-zinc-100 dark:bg-zinc-900 cursor-pointer transition-all duration-150 ${
                focused ? "ring-2 ring-black dark:ring-white ring-offset-1 ring-offset-white dark:ring-offset-black z-10" : ""
            }`}
            style={{ aspectRatio: "1/1" }}
        >
            {!isVideo && (
                media?.url
                    ? <Image src={media.url} alt={post.caption || "Post"} fill className={`object-cover transition-transform duration-500 ${highlighted ? "scale-105" : "scale-100"}`} unoptimized />
                    : <div className="w-full h-full bg-zinc-200 dark:bg-zinc-800" />
            )}
            {isVideo && media?.url && <VideoCard post={post} />}

            <div className={`absolute inset-0 bg-black/50 flex items-center justify-center gap-4 transition-opacity duration-200 z-10 ${highlighted ? "opacity-100" : "opacity-0"}`}>
                <div className="flex items-center gap-1.5 text-white">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                    <span className="text-[11px] font-black tabular-nums">{post.likesCount}</span>
                </div>
                <div className="flex items-center gap-1.5 text-white">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    <span className="text-[11px] font-black tabular-nums">{post.commentsCount}</span>
                </div>
            </div>
        </div>
    );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function GridSkeleton() {
    return (
        <>
            {[...Array(12)].map((_, i) => (
                <div key={i} className="bg-zinc-100 dark:bg-zinc-900 animate-pulse" style={{ aspectRatio: "1/1" }} />
            ))}
        </>
    );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ExplorePage() {
    const [posts, setPosts] = useState<FeedPost[]>(() => cache.getStale<FeedPost[]>(CACHE_KEY) ?? []);
    const [loading, setLoading] = useState(() => !cache.getStale<FeedPost[]>(CACHE_KEY));
    const [error, setError] = useState<string | null>(null);
    const [modalIndex, setModalIndex] = useState<number | null>(null);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const fetchedRef = useRef(false);
    const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

    const fetchFeed = useCallback(async () => {
        setError(null);
        await swr<FeedPost[]>(
            CACHE_KEY,
            async () => {
                const res = await getExploreFeed();
                const data = res.data.data;
                return Array.isArray(data) ? data : [];
            },
            (data) => { setPosts(data); setLoading(false); },
            () => {
                setPosts(p => { if (!p.length) setError("Failed to load explore feed."); return p; });
                setLoading(false);
            },
            CACHE_TTL,
        );
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (fetchedRef.current) return;
        fetchedRef.current = true;
        fetchFeed();
    }, [fetchFeed]);

    const openModal  = (i: number) => { setModalIndex(i); setFocusedIndex(i); };
    const closeModal = useCallback(() => setModalIndex(null), []);
    const prevPost   = useCallback(() => setModalIndex(i => (i !== null && i > 0 ? i - 1 : i)), []);
    const nextPost   = useCallback(() => setModalIndex(i => (i !== null && i < posts.length - 1 ? i + 1 : i)), [posts.length]);

    useEffect(() => {
        if (!posts.length) return;
        const COLS = 3, total = posts.length;
        const handler = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName;
            if (tag === "INPUT" || tag === "TEXTAREA") return;
            if (modalIndex !== null) {
                if (!["ArrowUp", "ArrowDown", "Escape"].includes(e.key)) return;
                e.preventDefault();
                if (e.key === "Escape")    { closeModal(); return; }
                if (e.key === "ArrowUp")   prevPost();
                if (e.key === "ArrowDown") nextPost();
                return;
            }
            if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", "Escape"].includes(e.key)) return;
            e.preventDefault();
            if (e.key === "Escape") { setFocusedIndex(-1); return; }
            if (e.key === "Enter" && focusedIndex >= 0) { openModal(focusedIndex); return; }
            setFocusedIndex(prev => {
                if (prev === -1) return 0;
                if (e.key === "ArrowRight") return Math.min(prev + 1, total - 1);
                if (e.key === "ArrowLeft")  return Math.max(prev - 1, 0);
                if (e.key === "ArrowDown")  return Math.min(prev + COLS, total - 1);
                if (e.key === "ArrowUp")    return Math.max(prev - COLS, 0);
                return prev;
            });
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [posts.length, focusedIndex, modalIndex, closeModal, prevPost, nextPost]);

    useEffect(() => {
        if (focusedIndex < 0 || modalIndex !== null) return;
        cardRefs.current[focusedIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, [focusedIndex, modalIndex]);

    const retry = () => { cache.invalidate(CACHE_KEY); fetchedRef.current = false; setError(null); setLoading(true); setPosts([]); fetchFeed(); };

    const activePostId = modalIndex !== null ? posts[modalIndex]?._id ?? null : null;
    const hasPrev = modalIndex !== null && modalIndex > 0;
    const hasNext = modalIndex !== null && modalIndex < posts.length - 1;

    return (
        <div className="min-h-screen bg-white dark:bg-black">
            <div className="sticky top-0 z-30 bg-white dark:bg-black border-b border-zinc-200 dark:border-zinc-800">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Compass size={14} className="text-zinc-400" strokeWidth={1.5} />
                        <div>
                            <p className="text-[8px] font-bold tracking-[0.3em] uppercase text-zinc-400 dark:text-zinc-500">Discover</p>
                            <h1 className="font-nothing text-[15px] text-black dark:text-white leading-none">Explore</h1>
                        </div>
                    </div>
                    {!loading && posts.length > 0 && (
                        <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-zinc-300 dark:text-zinc-700 hidden sm:block">
                            ← → ↑ ↓ browse · click to open
                        </span>
                    )}
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-0.5 pt-0.5">
                {!loading && error && !posts.length && (
                    <div className="flex flex-col items-center justify-center py-24 gap-3 px-6">
                        <p className="text-[11px] text-red-500 font-medium text-center">{error}</p>
                        <button onClick={retry} className="text-[9px] font-bold tracking-[0.2em] uppercase border border-zinc-300 dark:border-zinc-700 px-4 py-2 hover:border-black dark:hover:border-white transition-colors text-black dark:text-white">Retry</button>
                    </div>
                )}

                {!loading && !error && posts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-32 gap-4 px-6">
                        <div className="w-12 h-12 rounded-full border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                            <Compass size={18} strokeWidth={1.5} className="text-zinc-400" />
                        </div>
                        <div className="text-center">
                            <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">Nothing to explore</p>
                            <p className="text-[11px] text-zinc-400 dark:text-zinc-600 mt-1">Check back soon for trending posts</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-3 gap-0.5">
                    {loading && <GridSkeleton />}
                    {!loading && !error && posts.map((post, i) => {
                        const isFeatured = i % 7 === 6;
                        return (
                            <div key={post._id} className={isFeatured ? "col-span-2 row-span-2" : ""}>
                                <ExploreCard post={post} focused={focusedIndex === i} cardRef={el => { cardRefs.current[i] = el; }} onClick={() => openModal(i)} />
                            </div>
                        );
                    })}
                </div>

                {!loading && posts.length > 0 && (
                    <div className="flex items-center gap-3 px-4 py-8">
                        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                        <p className="text-[9px] font-bold tracking-[0.25em] uppercase text-zinc-300 dark:text-zinc-700">End of explore</p>
                        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                    </div>
                )}
            </div>

            {activePostId && (
                <>
                    <PostModal key={activePostId} postId={activePostId} onClose={closeModal} />
                    {hasPrev && (
                        <button onClick={prevPost} className="fixed right-6 z-[9999] w-9 h-9 flex items-center justify-center bg-white/90 dark:bg-black/90 border border-zinc-200 dark:border-zinc-700 hover:border-black dark:hover:border-white text-black dark:text-white shadow-lg transition-colors active:scale-95" style={{ top: "calc(50% - 48px)" }} title="Previous post (↑)">
                            <ChevronUp size={16} />
                        </button>
                    )}
                    {hasNext && (
                        <button onClick={nextPost} className="fixed right-6 z-[9999] w-9 h-9 flex items-center justify-center bg-white/90 dark:bg-black/90 border border-zinc-200 dark:border-zinc-700 hover:border-black dark:hover:border-white text-black dark:text-white shadow-lg transition-colors active:scale-95" style={{ top: "calc(50% + 8px)" }} title="Next post (↓)">
                            <ChevronDown size={16} />
                        </button>
                    )}
                    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
                        <span className="text-[9px] font-black tracking-[0.2em] uppercase bg-white/80 dark:bg-black/80 border border-zinc-200 dark:border-zinc-800 px-2.5 py-1 text-zinc-500 dark:text-zinc-400 tabular-nums backdrop-blur-sm">
                            {(modalIndex ?? 0) + 1} / {posts.length}
                        </span>
                    </div>
                    <div className="fixed bottom-4 right-6 z-[9999] pointer-events-none hidden sm:block">
                        <span className="text-[8px] font-bold tracking-[0.15em] uppercase bg-black/50 dark:bg-white/10 px-2.5 py-1.5 text-white/50 backdrop-blur-sm">
                            ↑ prev · ↓ next · Esc close
                        </span>
                    </div>
                </>
            )}
        </div>
    );
}