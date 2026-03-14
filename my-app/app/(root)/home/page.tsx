"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, Home, ImageOff, Play, UserPlus, Check, Wifi } from "lucide-react";
import { getHomeFeed, type FeedPost } from "../../../src/lib/api/feedApi";
import { toggleLike } from "../../../src/lib/api/postApi";
import { cache, swr } from "../../../src/lib/cache";

const CACHE_KEY = "feed:home";
const CACHE_TTL = 2 * 60_000;

// ─── Global CSS — Nothing OS aesthetic ───────────────────────────────────────
const GCSS = `
@keyframes hf-scan    { 0%{transform:translateY(-100%)} 100%{transform:translateY(800%)} }
@keyframes hf-blink   { 0%,100%{opacity:1} 50%{opacity:.14} }
@keyframes hf-pulse   { 0%,100%{opacity:.8;transform:scale(1)} 50%{opacity:.3;transform:scale(.7)} }
@keyframes hf-ping    { 0%{transform:scale(1);opacity:.7} 100%{transform:scale(2.4);opacity:0} }
@keyframes hf-in      { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
@keyframes hf-shimmer { from{background-position:200% 0} to{background-position:-200% 0} }

.hf-dot-grid {
  background-image: radial-gradient(circle, currentColor 0.8px, transparent 0.8px);
  background-size: 14px 14px;
}
.hf-scan-line {
  position:absolute; left:0; right:0; height:1px;
  background: linear-gradient(90deg, transparent, rgba(255,0,0,0.4), transparent);
  animation: hf-scan 3.5s linear infinite;
  pointer-events:none;
}
.hf-tile-in { animation: hf-in .3s cubic-bezier(.32,.72,0,1) both; }

.hf-skel {
  background: linear-gradient(90deg, #e4e4e7 25%, #f4f4f5 50%, #e4e4e7 75%);
  background-size:400% 100%;
  animation: hf-shimmer 1.6s ease infinite;
}
.dark .hf-skel {
  background: linear-gradient(90deg, #1a1a1a 25%, #242424 50%, #1a1a1a 75%);
  background-size:400% 100%;
}

.hf-card:hover .hf-media { filter: grayscale(0%) brightness(1.02); transform: scale(1.02); }
.hf-media {
  position:absolute; inset:0; width:100%; height:100%;
  object-fit:cover; display:block;
  filter: grayscale(15%) brightness(.95);
  transition: filter .5s cubic-bezier(.32,.72,0,1), transform .5s cubic-bezier(.32,.72,0,1);
}
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d`;
    return `${Math.floor(d / 7)}w`;
}

// ─── Dot Live Indicator ───────────────────────────────────────────────────────
function LiveDot({ color = "#FF0000" }: { color?: string }) {
    return (
        <div className="relative shrink-0" style={{ width: 8, height: 8 }}>
            <div className="absolute inset-0 rounded-full" style={{ background: color, animation: "hf-pulse 1.6s ease infinite" }} />
            <div className="absolute inset-0 rounded-full" style={{ background: color, animation: "hf-ping 1.6s ease infinite" }} />
        </div>
    );
}

// ─── Post Card ────────────────────────────────────────────────────────────────
function PostCard({ post, index }: { post: FeedPost; index: number }) {
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(post.likesCount);
    const [liking, setLiking] = useState(false);
    const media = post.media?.[0];
    const isVideo = media?.type === "video";

    const handleLike = async () => {
        if (liking) return;
        setLiking(true);
        const wasLiked = liked;
        setLiked(!wasLiked);
        setLikeCount(prev => wasLiked ? prev - 1 : prev + 1);
        try { await toggleLike(post._id, "Post"); }
        catch { setLiked(wasLiked); setLikeCount(prev => wasLiked ? prev + 1 : prev - 1); }
        finally { setLiking(false); }
    };

    return (
        <article
            className="hf-card relative overflow-hidden bg-white dark:bg-[#0D0D0D] border border-zinc-200 dark:border-zinc-800"
            style={{
                borderRadius: 24,
                animation: `hf-in .32s cubic-bezier(.32,.72,0,1) ${index * 0.06}s both`,
            }}
        >
            {/* Dot matrix watermark */}
            <div className="hf-dot-grid absolute inset-0 opacity-[0.03] dark:opacity-[0.055] pointer-events-none text-black dark:text-white" />
            {/* Red scan line */}
            <div className="hf-scan-line" />
            {/* Red corner accent */}
            <div className="absolute top-0 left-0 w-px h-10 bg-gradient-to-b from-red-600/60 to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 h-px w-10 bg-gradient-to-r from-red-600/60 to-transparent pointer-events-none" />

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-3">
                <Link href={`/profile/${post.author.username}`} className="flex items-center gap-2.5 min-w-0 group">
                    <div className="relative shrink-0">
                        <div className="w-9 h-9 overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center"
                            style={{ borderRadius: 8 }}>
                            {post.author.profilePicture
                                ? <Image src={post.author.profilePicture} alt={post.author.username} width={36} height={36} className="w-full h-full object-cover" unoptimized />
                                : <span className="font-mono text-[10px] font-black text-zinc-500 uppercase">{post.author.username.slice(0, 2)}</span>
                            }
                        </div>
                        {/* Live indicator dot */}
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-600 border-2 border-white dark:border-[#0D0D0D]"
                            style={{ boxShadow: "0 0 6px rgba(255,0,0,0.6)" }} />
                    </div>
                    <div className="min-w-0">
                        <p className="font-mono text-[11px] font-black text-black dark:text-white uppercase tracking-[0.12em] truncate leading-none group-hover:text-red-600 transition-colors">
                            {post.author.username}
                        </p>
                        <p className="font-mono text-[8px] text-zinc-400 dark:text-zinc-600 tracking-[0.2em] uppercase mt-0.5">
                            {timeAgo(post.createdAt)}_ago
                        </p>
                    </div>
                </Link>

                {/* Post index badge */}
                <div className="shrink-0 font-mono text-[8px] font-black text-zinc-300 dark:text-zinc-700 tracking-[0.2em]">
                    #{String(index + 1).padStart(2, "0")}
                </div>
            </div>

            {/* Media */}
            {media?.url ? (
                <div className="relative mx-3 overflow-hidden bg-zinc-900" style={{ borderRadius: 14, aspectRatio: "4/5", maxHeight: 520 }}>
                    {isVideo ? (
                        <video src={media.url} className="w-full h-full object-cover" controls playsInline preload="metadata" />
                    ) : (
                        <Image src={media.url} alt={post.caption || "Post"} fill className="hf-media" unoptimized />
                    )}
                    {/* Video badge */}
                    {isVideo && (
                        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm border border-white/10" style={{ borderRadius: 5 }}>
                            <Play size={9} fill="white" className="text-white" />
                            <span className="font-mono text-[8px] font-black text-white tracking-[0.15em] uppercase">Reel</span>
                        </div>
                    )}
                    {/* Bottom gradient with engagement */}
                    <div className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
                        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)" }} />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 text-white/80">
                                <Heart size={11} strokeWidth={1.5} />
                                <span className="font-mono text-[9px] font-bold tabular-nums">{likeCount}</span>
                            </div>
                            <div className="flex items-center gap-1 text-white/80">
                                <MessageCircle size={11} strokeWidth={1.5} />
                                <span className="font-mono text-[9px] font-bold tabular-nums">{post.commentsCount}</span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="mx-3 bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center" style={{ borderRadius: 14, aspectRatio: "4/5", maxHeight: 300 }}>
                    <div className="flex flex-col items-center gap-2">
                        <ImageOff size={20} className="text-zinc-300 dark:text-zinc-700" />
                        <span className="font-mono text-[8px] text-zinc-400 dark:text-zinc-600 tracking-[0.2em] uppercase">No_Media</span>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="relative z-10 px-4 pt-3 pb-2 flex items-center gap-3">
                <button onClick={handleLike} disabled={liking}
                    className={`flex items-center gap-1.5 transition-all active:scale-90 ${liked ? "text-red-500" : "text-zinc-500 dark:text-zinc-400 hover:text-red-500"}`}>
                    <Heart size={16} strokeWidth={liked ? 0 : 1.5} fill={liked ? "currentColor" : "none"}
                        className={liked ? "drop-shadow-[0_0_6px_rgba(255,0,0,0.6)]" : ""} />
                    <span className="font-mono text-[10px] font-black tabular-nums">{likeCount}</span>
                </button>
                <Link href={`/posts/${post._id}`}
                    className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors">
                    <MessageCircle size={16} strokeWidth={1.5} />
                    <span className="font-mono text-[10px] font-black tabular-nums">{post.commentsCount}</span>
                </Link>
            </div>

            {/* Caption */}
            {post.caption && (
                <div className="relative z-10 px-4 pb-4">
                    <p className="font-mono text-[11px] text-black dark:text-white leading-relaxed">
                        <span className="font-black text-red-600 mr-1.5 uppercase tracking-[0.08em]">{post.author.username}_</span>
                        <span className="text-zinc-600 dark:text-zinc-400">{post.caption}</span>
                    </p>
                </div>
            )}
        </article>
    );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function PostSkeleton({ delay = 0 }: { delay?: number }) {
    return (
        <div className="bg-white dark:bg-[#0D0D0D] border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            style={{ borderRadius: 24, animationDelay: `${delay}s` }}>
            <div className="flex items-center gap-2.5 px-4 py-4">
                <div className="hf-skel w-9 h-9 shrink-0" style={{ borderRadius: 8 }} />
                <div className="space-y-2 flex-1">
                    <div className="hf-skel h-2.5 w-28 rounded" />
                    <div className="hf-skel h-2 w-16 rounded" />
                </div>
            </div>
            <div className="mx-3 hf-skel" style={{ borderRadius: 14, aspectRatio: "4/5", maxHeight: 360 }} />
            <div className="px-4 py-3 flex gap-4">
                <div className="hf-skel h-3.5 w-12 rounded" />
                <div className="hf-skel h-3.5 w-12 rounded" />
            </div>
        </div>
    );
}

// ─── Suggestion Card ──────────────────────────────────────────────────────────
const DUMMY_SUGGESTIONS = [
    { id: "1", username: "0xmira_dev",   name: "Mira Chen",     avatar: null, followers: "12.4K", reason: "Popular_in_tech" },
    { id: "2", username: "signal_zeta",  name: "Zeta Signal",   avatar: null, followers: "8.1K",  reason: "Suggested_for_you" },
    { id: "3", username: "nothinguser_",  name: "Nothing User",  avatar: null, followers: "3.2K",  reason: "New_on_zynon" },
    { id: "4", username: "px_architect", name: "Px Architect",  avatar: null, followers: "22K",   reason: "Followed_by_network" },
    { id: "5", username: "vera.circuit", name: "Vera Circuit",  avatar: null, followers: "5.7K",  reason: "Trending_now" },
];

function SuggestionItem({ user, index }: { user: typeof DUMMY_SUGGESTIONS[0]; index: number }) {
    const [followed, setFollowed] = useState(false);
    const initials = user.username.slice(0, 2).toUpperCase();
    // Deterministic accent colors per slot
    const accents = ["#FF2222", "#FF6B00", "#00C2FF", "#A855F7", "#22C55E"];
    const accent = accents[index % accents.length];

    return (
        <div
            className="flex items-center gap-3 py-3 border-b border-zinc-100 dark:border-zinc-900 last:border-0"
            style={{ animation: `hf-in .28s cubic-bezier(.32,.72,0,1) ${index * 0.07}s both` }}
        >
            {/* Avatar */}
            <div className="shrink-0 w-8 h-8 flex items-center justify-center font-mono text-[10px] font-black uppercase border border-zinc-200 dark:border-zinc-800"
                style={{ borderRadius: 8, background: `${accent}18`, color: accent }}>
                {initials}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="font-mono text-[10px] font-black text-black dark:text-white uppercase tracking-[0.08em] truncate">
                    {user.username}
                </p>
                <p className="font-mono text-[8px] text-zinc-400 dark:text-zinc-600 tracking-[0.12em] uppercase truncate mt-0.5">
                    {user.reason}
                </p>
            </div>

            {/* Follow button */}
            <button
                onClick={() => setFollowed(f => !f)}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 font-mono text-[8px] font-black uppercase tracking-[0.15em] border transition-all active:scale-95"
                style={{
                    borderRadius: 6,
                    borderColor: followed ? accent : undefined,
                    background: followed ? `${accent}18` : undefined,
                    color: followed ? accent : undefined,
                }}
            >
                {followed
                    ? <><Check size={9} strokeWidth={3} /> Done</>
                    : <><UserPlus size={9} strokeWidth={2} /> Follow</>
                }
            </button>
        </div>
    );
}

function SuggestionsPanel() {
    return (
        <div className="sticky top-24">
            {/* Main suggestions card */}
            <div className="relative overflow-hidden bg-white dark:bg-[#0D0D0D] border border-zinc-200 dark:border-zinc-800"
                style={{ borderRadius: 24 }}>
                {/* Dot grid */}
                <div className="hf-dot-grid absolute inset-0 opacity-[0.03] dark:opacity-[0.055] pointer-events-none text-black dark:text-white" />
                {/* Corner accent */}
                <div className="absolute top-0 right-0 w-px h-10 bg-gradient-to-b from-red-600/60 to-transparent pointer-events-none" />
                <div className="absolute top-0 right-0 h-px w-10 bg-gradient-to-l from-red-600/60 to-transparent pointer-events-none" />

                {/* Header */}
                <div className="relative z-10 px-4 pt-4 pb-3 border-b border-zinc-100 dark:border-zinc-900">
                    <div className="flex items-center gap-2 mb-1">
                        <LiveDot />
                        <span className="font-mono text-[8px] font-black tracking-[0.3em] uppercase text-zinc-400 dark:text-zinc-500">
                            Suggested_Nodes
                        </span>
                    </div>
                    <p className="font-mono text-[13px] font-black text-black dark:text-white uppercase tracking-[0.08em]">
                        Expand_Network
                    </p>
                </div>

                {/* Suggestions list */}
                <div className="relative z-10 px-4">
                    {DUMMY_SUGGESTIONS.map((user, i) => (
                        <SuggestionItem key={user.id} user={user} index={i} />
                    ))}
                </div>

                {/* Footer */}
                <div className="relative z-10 px-4 py-3 border-t border-zinc-100 dark:border-zinc-900">
                    <button className="w-full font-mono text-[8px] font-black tracking-[0.25em] uppercase text-zinc-400 dark:text-zinc-600 hover:text-red-600 transition-colors">
                        See_All_Suggestions →
                    </button>
                </div>
            </div>

            {/* System status card */}
            <div className="relative mt-3 overflow-hidden bg-white dark:bg-[#0D0D0D] border border-zinc-200 dark:border-zinc-800 px-4 py-4"
                style={{ borderRadius: 20 }}>
                <div className="hf-dot-grid absolute inset-0 opacity-[0.025] dark:opacity-[0.04] pointer-events-none text-black dark:text-white" />
                <div className="relative z-10 flex items-center justify-between mb-3">
                    <span className="font-mono text-[8px] font-black tracking-[0.3em] uppercase text-zinc-400">System_Status</span>
                    <Wifi size={10} className="text-green-500" />
                </div>
                {[
                    { label: "Feed_Sync",    value: "Live",    ok: true },
                    { label: "Connections",  value: "Active",  ok: true },
                    { label: "Notifications", value: "On",     ok: true },
                ].map(s => (
                    <div key={s.label} className="flex items-center justify-between py-1.5">
                        <span className="font-mono text-[8px] text-zinc-400 dark:text-zinc-600 tracking-[0.15em] uppercase">{s.label}</span>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" style={{ animation: "hf-pulse 2s ease infinite" }} />
                            <span className="font-mono text-[8px] font-black text-green-600 tracking-[0.1em] uppercase">{s.value}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomeFeedPage() {
    // `mounted` ensures cache reads (which may differ between server and client)
    // only influence state after hydration, preventing SSR/client mismatches.
    const [mounted, setMounted] = useState(false);
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const fetchedRef = useRef(false);

    // Hydrate from cache after mount, then kick off the network fetch.
    useEffect(() => {
        setMounted(true);
        const stale = cache.getStale<FeedPost[]>(CACHE_KEY);
        if (stale) {
            setPosts(stale);
            setLoading(false);
        }
    }, []);

    const fetchFeed = useCallback(async () => {
        setError(null);
        await swr<FeedPost[]>(
            CACHE_KEY,
            async () => {
                const res = await getHomeFeed();
                const data = res.data.data;
                return Array.isArray(data) ? data : [];
            },
            (data) => { setPosts(data); setLoading(false); },
            () => {
                setPosts(p => { if (!p.length) setError("Failed to load feed."); return p; });
                setLoading(false);
            },
            CACHE_TTL,
        );
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!mounted) return;
        if (fetchedRef.current) return;
        fetchedRef.current = true;
        fetchFeed();
    }, [mounted, fetchFeed]);

    const retry = () => {
        cache.invalidate(CACHE_KEY);
        fetchedRef.current = false;
        setError(null);
        setLoading(true);
        setPosts([]);
        fetchFeed();
    };

    return (
        <>
            <style>{GCSS}</style>

            <div className="min-h-screen bg-zinc-50 dark:bg-[#080808]">
                {/* ── Header ── */}
                <div className="sticky top-0 z-30 bg-white/90 dark:bg-[#0D0D0D]/90 border-b border-zinc-200 dark:border-zinc-800 backdrop-blur-xl">
                    <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="relative w-7 h-7 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center bg-white dark:bg-black"
                                style={{ borderRadius: 7 }}>
                                <Home size={13} className="text-black dark:text-white" strokeWidth={2} />
                                <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-600 border border-white dark:border-[#0D0D0D]"
                                    style={{ animation: "hf-pulse 1.8s ease infinite" }} />
                            </div>
                            <div>
                                <p className="font-mono text-[7px] font-black tracking-[0.4em] uppercase text-zinc-400 dark:text-zinc-500">
                                    Following_Feed
                                </p>
                                <h1 className="font-mono text-[14px] font-black text-black dark:text-white uppercase tracking-[0.08em] leading-none">
                                    Home
                                </h1>
                            </div>
                        </div>

                        {/* Post count badge */}
                        {posts.length > 0 && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                                style={{ borderRadius: 8 }}>
                                <LiveDot />
                                <span className="font-mono text-[8px] font-black tracking-[0.2em] uppercase text-zinc-600 dark:text-zinc-400">
                                    {String(posts.length).padStart(3, "0")}_posts
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Two-column layout ── */}
                <div className="max-w-6xl mx-auto px-4 py-6">
                    <div className="flex gap-6">

                        {/* ── Feed column ── */}
                        <div className="flex-1 min-w-0 space-y-4">

                            {/* Loading */}
                            {loading && (
                                <><PostSkeleton delay={0} /><PostSkeleton delay={0.08} /><PostSkeleton delay={0.16} /></>
                            )}

                            {/* Error */}
                            {!loading && error && !posts.length && (
                                <div className="relative overflow-hidden bg-white dark:bg-[#0D0D0D] border border-red-200 dark:border-red-900 p-8 text-center"
                                    style={{ borderRadius: 24 }}>
                                    <div className="hf-dot-grid absolute inset-0 opacity-[0.03] pointer-events-none text-red-600" />
                                    <div className="relative z-10">
                                        <p className="font-mono text-[8px] font-black tracking-[0.3em] uppercase text-red-600 mb-2">Error_Loading</p>
                                        <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 mb-4">{error}</p>
                                        <button onClick={retry}
                                            className="font-mono text-[9px] font-black tracking-[0.25em] uppercase px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black hover:bg-red-600 dark:hover:bg-red-500 hover:text-white transition-colors"
                                            style={{ borderRadius: 8 }}>
                                            Retry_Connection
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Empty */}
                            {!loading && !error && posts.length === 0 && (
                                <div className="relative overflow-hidden bg-white dark:bg-[#0D0D0D] border border-zinc-200 dark:border-zinc-800 py-20 px-8 text-center"
                                    style={{ borderRadius: 24 }}>
                                    <div className="hf-dot-grid absolute inset-0 opacity-[0.03] dark:opacity-[0.055] pointer-events-none text-black dark:text-white" />
                                    <div className="hf-scan-line" />
                                    <div className="relative z-10">
                                        <div className="inline-flex items-center justify-center w-14 h-14 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 mb-5"
                                            style={{ borderRadius: 14 }}>
                                            <Home size={22} className="text-zinc-300 dark:text-zinc-600" strokeWidth={1.5} />
                                        </div>
                                        <p className="font-mono text-[8px] font-black tracking-[0.4em] uppercase text-zinc-400 dark:text-zinc-500 mb-2">
                                            Feed_Empty
                                        </p>
                                        <p className="font-mono text-[12px] font-black text-black dark:text-white uppercase tracking-[0.06em] mb-1">
                                            No_Transmissions
                                        </p>
                                        <p className="font-mono text-[10px] text-zinc-400 dark:text-zinc-600 tracking-[0.08em]">
                                            Follow accounts to receive signals
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Posts */}
                            {posts.map((post, i) => (
                                <PostCard key={post._id} post={post} index={i} />
                            ))}

                            {/* End of feed */}
                            {!loading && posts.length > 0 && (
                                <div className="relative overflow-hidden bg-white dark:bg-[#0D0D0D] border border-zinc-200 dark:border-zinc-800 py-8 px-6 text-center"
                                    style={{ borderRadius: 20 }}>
                                    <div className="hf-dot-grid absolute inset-0 opacity-[0.025] dark:opacity-[0.04] pointer-events-none text-black dark:text-white" />
                                    <div className="relative z-10 flex items-center justify-center gap-3">
                                        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-600"
                                                style={{ animation: "hf-pulse 2s ease infinite" }} />
                                            <span className="font-mono text-[8px] font-black tracking-[0.3em] uppercase text-zinc-400 dark:text-zinc-600">
                                                End_of_Feed
                                            </span>
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-600"
                                                style={{ animation: "hf-pulse 2s ease infinite .4s" }} />
                                        </div>
                                        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Suggestions sidebar ── */}
                        <div className="w-72 shrink-0 hidden lg:block">
                            <SuggestionsPanel />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}