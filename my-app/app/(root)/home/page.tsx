"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, Home, ImageOff, Play, Wifi, Share2, Bookmark } from "lucide-react";
import { getHomeFeed, type FeedPost } from "../../../src/lib/api/feedApi";
import { toggleLike } from "../../../src/lib/api/postApi";
import { cache, swr } from "../../../src/lib/cache";

const CACHE_KEY = "feed:home";
const CACHE_TTL = 2 * 60_000;

// ─── Global CSS ───────────────────────────────────────────────────────────────
const GCSS = `
@keyframes hf-scan    { 0%{transform:translateY(-100%)} 100%{transform:translateY(800%)} }
@keyframes hf-pulse   { 0%,100%{opacity:.8;transform:scale(1)} 50%{opacity:.3;transform:scale(.7)} }
@keyframes hf-ping    { 0%{transform:scale(1);opacity:.7} 100%{transform:scale(2.4);opacity:0} }
@keyframes hf-in      { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
@keyframes hf-shimmer { from{background-position:200% 0} to{background-position:-200% 0} }
@keyframes hf-like    { 0%{transform:scale(1)} 30%{transform:scale(1.38)} 60%{transform:scale(.9)} 100%{transform:scale(1)} }

.hf-dot-grid {
  background-image: radial-gradient(circle, currentColor 0.7px, transparent 0.7px);
  background-size: 16px 16px;
}
.hf-skel {
  background: linear-gradient(90deg, #e4e4e7 25%, #f0f0f1 50%, #e4e4e7 75%);
  background-size: 400% 100%;
  animation: hf-shimmer 1.6s ease infinite;
}
.dark .hf-skel {
  background: linear-gradient(90deg, #161616 25%, #202020 50%, #161616 75%);
  background-size: 400% 100%;
}
.hf-card .hf-media {
  transition: transform .6s cubic-bezier(.32,.72,0,1), filter .6s cubic-bezier(.32,.72,0,1);
  filter: brightness(.92);
}
.hf-card:hover .hf-media { transform: scale(1.03); filter: brightness(1); }
.hf-liked { animation: hf-like .35s cubic-bezier(.34,1.56,.64,1) both; }
.hf-scan {
  position: absolute; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,0,0,.3), transparent);
  animation: hf-scan 4s linear infinite;
  pointer-events: none; z-index: 2;
}
.hf-action { transition: color .15s, transform .15s cubic-bezier(.34,1.56,.64,1); }
.hf-action:hover { transform: scale(1.12); }
.hf-action:active { transform: scale(.88); }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
    const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    if (s < 604800) return `${Math.floor(s / 86400)}d`;
    return `${Math.floor(s / 604800)}w`;
}
function fmtCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
}

function LiveDot() {
    return (
        <div className="relative shrink-0 w-2 h-2">
            <div className="absolute inset-0 rounded-full bg-red-600" style={{ animation: "hf-pulse 1.8s ease infinite" }} />
            <div className="absolute inset-0 rounded-full bg-red-600" style={{ animation: "hf-ping 1.8s ease infinite" }} />
        </div>
    );
}

// ─── Post Card ────────────────────────────────────────────────────────────────
function PostCard({ post, index }: { post: FeedPost; index: number }) {
    const [liked,     setLiked]     = useState(false);
    const [likeCount, setLikeCount] = useState(post.likesCount);
    const [liking,    setLiking]    = useState(false);
    const [saved,     setSaved]     = useState(false);
    const [likeAnim,  setLikeAnim]  = useState(false);
    const media   = post.media?.[0];
    const isVideo = media?.type === "video";

    const handleLike = async () => {
        if (liking) return;
        setLiking(true);
        const was = liked;
        setLiked(!was);
        setLikeCount(p => was ? p - 1 : p + 1);
        if (!was) { setLikeAnim(true); setTimeout(() => setLikeAnim(false), 400); }
        try { await toggleLike(post._id, "Post"); }
        catch { setLiked(was); setLikeCount(p => was ? p + 1 : p - 1); }
        finally { setLiking(false); }
    };

    return (
        <article
            className="hf-card relative bg-white dark:bg-[#0D0D0D] border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            style={{
                borderRadius: 20,
                animation: `hf-in .36s cubic-bezier(.32,.72,0,1) ${Math.min(index, 5) * 0.07}s both`,
            }}
        >
            <div className="hf-dot-grid absolute inset-0 opacity-[0.025] dark:opacity-[0.045] pointer-events-none text-black dark:text-white" />
            <div className="hf-scan" />
            {/* Red corner */}
            <div className="absolute top-0 left-0 w-px h-12 bg-gradient-to-b from-red-600/70 to-transparent pointer-events-none z-10" />
            <div className="absolute top-0 left-0 h-px w-12 bg-gradient-to-r from-red-600/70 to-transparent pointer-events-none z-10" />

            {/* Author */}
            <div className="relative z-10 flex items-center gap-3 px-5 pt-5 pb-4">
                <Link href={`/profile/${post.author.username}`} className="flex items-center gap-3 min-w-0 flex-1 group">
                    <div className="relative shrink-0">
                        <div className="w-10 h-10 overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800" style={{ borderRadius: 10 }}>
                            {post.author.profilePicture
                                ? <Image src={post.author.profilePicture} alt={post.author.username} width={40} height={40} className="w-full h-full object-cover" unoptimized />
                                : <span className="w-full h-full flex items-center justify-center font-mono text-[11px] font-black text-zinc-400 uppercase">{post.author.username.slice(0, 2)}</span>
                            }
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-600 border-2 border-white dark:border-[#0D0D0D]"
                            style={{ boxShadow: "0 0 8px rgba(255,0,0,0.65)" }} />
                    </div>
                    <div className="min-w-0">
                        <p className="font-mono text-[12px] font-black text-black dark:text-white uppercase tracking-[0.1em] truncate leading-none group-hover:text-red-600 transition-colors duration-200">
                            {post.author.username}
                        </p>
                        <p className="font-mono text-[9px] text-zinc-400 dark:text-zinc-600 tracking-[0.18em] uppercase mt-1 leading-none">
                            {timeAgo(post.createdAt)} ago
                        </p>
                    </div>
                </Link>
                <div className="shrink-0 px-2 py-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800" style={{ borderRadius: 6 }}>
                    <span className="font-mono text-[8px] font-black tracking-[0.2em] text-zinc-400 dark:text-zinc-600">
                        #{String(index + 1).padStart(2, "0")}
                    </span>
                </div>
            </div>

            {/* Media */}
            {media?.url ? (
                <div className="relative overflow-hidden bg-zinc-950 mx-4" style={{ borderRadius: 12 }}>
                    <div style={{ aspectRatio: "4/5", maxHeight: 560 }} className="relative overflow-hidden">
                        {isVideo ? (
                            <video src={media.url} className="w-full h-full object-cover" controls playsInline preload="metadata" />
                        ) : (
                            <Image src={media.url} alt={post.caption || "Post"} fill className="hf-media object-cover" unoptimized />
                        )}
                        {isVideo && (
                            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 bg-black/55 backdrop-blur-md border border-white/10" style={{ borderRadius: 7 }}>
                                <Play size={8} fill="white" className="text-white" />
                                <span className="font-mono text-[8px] font-black text-white tracking-[0.2em] uppercase">Reel</span>
                            </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 h-14 pointer-events-none"
                            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%)" }} />
                    </div>
                </div>
            ) : (
                <div className="mx-4 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center"
                    style={{ borderRadius: 12, aspectRatio: "4/5", maxHeight: 280 }}>
                    <div className="flex flex-col items-center gap-2.5">
                        <ImageOff size={22} className="text-zinc-300 dark:text-zinc-700" strokeWidth={1.5} />
                        <span className="font-mono text-[8px] text-zinc-400 dark:text-zinc-600 tracking-[0.25em] uppercase">No_Media</span>
                    </div>
                </div>
            )}

            {/* Caption */}
            {post.caption && (
                <div className="relative z-10 px-5 pt-4">
                    <p className="font-mono text-[12px] text-black dark:text-white leading-relaxed">
                        <Link href={`/profile/${post.author.username}`}
                            className="font-black text-red-600 hover:text-red-500 transition-colors mr-2 uppercase tracking-[0.06em]">
                            {post.author.username}
                        </Link>
                        <span className="text-zinc-600 dark:text-zinc-400 font-medium">{post.caption}</span>
                    </p>
                </div>
            )}

            {/* Actions — single row, no duplicates */}
            <div className="relative z-10 flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-5">
                    {/* Like — one button only */}
                    <button onClick={handleLike} disabled={liking}
                        className={`hf-action flex items-center gap-2 ${liked ? "text-red-500" : "text-zinc-500 dark:text-zinc-400 hover:text-red-500"}`}>
                        <Heart
                            size={18} strokeWidth={liked ? 0 : 1.75} fill={liked ? "currentColor" : "none"}
                            className={`${liked ? "drop-shadow-[0_0_8px_rgba(255,0,0,0.55)]" : ""} ${likeAnim ? "hf-liked" : ""}`}
                        />
                        <span className="font-mono text-[11px] font-black tabular-nums">{fmtCount(likeCount)}</span>
                    </button>

                    {/* Comment — one button only */}
                    <Link href={`/posts/${post._id}`}
                        className="hf-action flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white">
                        <MessageCircle size={18} strokeWidth={1.75} />
                        <span className="font-mono text-[11px] font-black tabular-nums">{fmtCount(post.commentsCount)}</span>
                    </Link>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { try { navigator.clipboard?.writeText(`${window.location.origin}/posts/${post._id}`); } catch {} }}
                        className="hf-action text-zinc-400 dark:text-zinc-600 hover:text-black dark:hover:text-white">
                        <Share2 size={16} strokeWidth={1.75} />
                    </button>
                    <button onClick={() => setSaved(s => !s)}
                        className={`hf-action ${saved ? "text-black dark:text-white" : "text-zinc-400 dark:text-zinc-600 hover:text-black dark:hover:text-white"}`}>
                        <Bookmark size={16} strokeWidth={1.75} fill={saved ? "currentColor" : "none"} />
                    </button>
                </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-600/15 to-transparent" />
        </article>
    );
}

// ─── Post Skeleton ────────────────────────────────────────────────────────────
function PostSkeleton({ delay = 0 }: { delay?: number }) {
    return (
        <div className="bg-white dark:bg-[#0D0D0D] border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            style={{ borderRadius: 20, animation: `hf-in .3s ease ${delay}s both` }}>
            <div className="flex items-center gap-3 px-5 pt-5 pb-4">
                <div className="hf-skel w-10 h-10 shrink-0" style={{ borderRadius: 10 }} />
                <div className="flex-1 space-y-2">
                    <div className="hf-skel h-3 w-32 rounded" />
                    <div className="hf-skel h-2 w-16 rounded" />
                </div>
            </div>
            <div className="mx-4 hf-skel" style={{ borderRadius: 12, aspectRatio: "4/5", maxHeight: 400 }} />
            <div className="flex items-center justify-between px-5 py-4">
                <div className="flex gap-5">
                    <div className="hf-skel h-4 w-14 rounded" />
                    <div className="hf-skel h-4 w-14 rounded" />
                </div>
                <div className="flex gap-3">
                    <div className="hf-skel h-4 w-4 rounded" />
                    <div className="hf-skel h-4 w-4 rounded" />
                </div>
            </div>
        </div>
    );
}

// ─── Suggestions ─────────────────────────────────────────────────────────────
interface Suggestion { userId: string; username: string; name: string; profilePicture: string | null; score: number }

async function fetchSuggestions(): Promise<Suggestion[]> {
    const base = process.env.NEXT_PUBLIC_API_BASE || "https://zynon.onrender.com/api/";
    let token: string | null = null;
    try { token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null; } catch {}
    if (!token) return [];
    const res = await fetch(`${base}suggestions/users-to-follow`, { headers: { Authorization: `Bearer ${token}`, "x-client-type": "web" } });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : [];
}

function SuggestionItem({ user, index }: { user: Suggestion; index: number }) {
    return (
        <Link href={`/profile/${user.username}`}
            className="flex items-center gap-3 py-3 border-b border-zinc-100 dark:border-zinc-900 last:border-0 group"
            style={{ animation: `hf-in .28s cubic-bezier(.32,.72,0,1) ${index * 0.06}s both` }}>
            <div className="shrink-0 w-9 h-9 overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800" style={{ borderRadius: 9 }}>
                {user.profilePicture
                    ? <img src={user.profilePicture} alt={user.username} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                    : <span className="w-full h-full flex items-center justify-center font-mono text-[10px] font-black text-zinc-400 uppercase">{user.username.slice(0, 2)}</span>
                }
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-mono text-[10px] font-black text-black dark:text-white uppercase tracking-[0.08em] truncate group-hover:text-red-600 transition-colors">
                    {user.username}
                </p>
                {user.name && (
                    <p className="font-mono text-[8px] text-zinc-400 dark:text-zinc-600 tracking-[0.1em] truncate mt-0.5">{user.name}</p>
                )}
            </div>
            {user.score > 0 && (
                <div className="shrink-0 flex items-center gap-1 px-2 py-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800" style={{ borderRadius: 6 }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-red-600" style={{ animation: "hf-pulse 2s ease infinite" }} />
                    <span className="font-mono text-[8px] font-black text-zinc-500 dark:text-zinc-400">{user.score}</span>
                </div>
            )}
        </Link>
    );
}

function SuggestionSkeleton() {
    return (
        <div className="flex items-center gap-3 py-3 border-b border-zinc-100 dark:border-zinc-900">
            <div className="hf-skel shrink-0 w-9 h-9" style={{ borderRadius: 9 }} />
            <div className="flex-1 space-y-1.5">
                <div className="hf-skel h-2.5 w-24 rounded" />
                <div className="hf-skel h-2 w-16 rounded" />
            </div>
        </div>
    );
}

function SuggestionsPanel() {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => { fetchSuggestions().then(setSuggestions).finally(() => setLoading(false)); }, []);

    return (
        <div className="sticky top-24 space-y-3">
            <div className="relative overflow-hidden bg-white dark:bg-[#0D0D0D] border border-zinc-200 dark:border-zinc-800" style={{ borderRadius: 20 }}>
                <div className="hf-dot-grid absolute inset-0 opacity-[0.025] dark:opacity-[0.045] pointer-events-none text-black dark:text-white" />
                <div className="absolute top-0 right-0 w-px h-10 bg-gradient-to-b from-red-600/60 to-transparent pointer-events-none" />
                <div className="absolute top-0 right-0 h-px w-10 bg-gradient-to-l from-red-600/60 to-transparent pointer-events-none" />

                <div className="relative z-10 px-4 pt-4 pb-3 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <LiveDot />
                            <span className="font-mono text-[7px] font-black tracking-[0.35em] uppercase text-zinc-400 dark:text-zinc-600">Suggested_Nodes</span>
                        </div>
                        <p className="font-mono text-[13px] font-black text-black dark:text-white uppercase tracking-[0.06em]">Expand_Network</p>
                    </div>
                    {!loading && suggestions.length > 0 && (
                        <span className="font-mono text-[8px] font-black text-zinc-400 dark:text-zinc-600">{suggestions.length}_nodes</span>
                    )}
                </div>

                <div className="relative z-10 px-4">
                    {loading && [0, 1, 2, 3].map(i => <SuggestionSkeleton key={i} />)}
                    {!loading && suggestions.length === 0 && (
                        <div className="py-8 text-center">
                            <p className="font-mono text-[8px] font-black tracking-[0.3em] uppercase text-zinc-400 dark:text-zinc-600">No_Suggestions</p>
                        </div>
                    )}
                    {!loading && suggestions.map((u, i) => <SuggestionItem key={u.userId} user={u} index={i} />)}
                </div>

                {!loading && suggestions.length > 0 && (
                    <div className="relative z-10 px-4 py-3 border-t border-zinc-100 dark:border-zinc-900">
                        <p className="font-mono text-[7px] tracking-[0.2em] uppercase text-zinc-400 dark:text-zinc-600">Based_on_your_network</p>
                    </div>
                )}
            </div>

            <div className="relative overflow-hidden bg-white dark:bg-[#0D0D0D] border border-zinc-200 dark:border-zinc-800 px-4 py-4" style={{ borderRadius: 16 }}>
                <div className="hf-dot-grid absolute inset-0 opacity-[0.02] dark:opacity-[0.035] pointer-events-none text-black dark:text-white" />
                <div className="relative z-10 flex items-center justify-between mb-3">
                    <span className="font-mono text-[8px] font-black tracking-[0.3em] uppercase text-zinc-400">System_Status</span>
                    <Wifi size={10} className="text-green-500" />
                </div>
                {[
                    { label: "Feed_Sync", value: "Live" },
                    { label: "Connections", value: "Active" },
                    { label: "Notifications", value: "On" },
                ].map(s => (
                    <div key={s.label} className="flex items-center justify-between py-1.5">
                        <span className="font-mono text-[8px] text-zinc-400 dark:text-zinc-600 tracking-[0.12em] uppercase">{s.label}</span>
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
    const [mounted,  setMounted]  = useState(false);
    const [posts,    setPosts]    = useState<FeedPost[]>([]);
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState<string | null>(null);
    const fetchedRef = useRef(false);

    useEffect(() => {
        setMounted(true);
        const stale = cache.getStale<FeedPost[]>(CACHE_KEY);
        if (stale) { setPosts(stale); setLoading(false); }
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
        if (!mounted || fetchedRef.current) return;
        fetchedRef.current = true;
        fetchFeed();
    }, [mounted, fetchFeed]);

    const retry = () => {
        cache.invalidate(CACHE_KEY);
        fetchedRef.current = false;
        setError(null); setLoading(true); setPosts([]);
        fetchFeed();
    };

    return (
        <>
            <style>{GCSS}</style>
            <div className="min-h-screen bg-zinc-50 dark:bg-[#080808]">

                {/* ── Header ── */}
                <div className="sticky top-0 z-30 bg-zinc-50/90 dark:bg-[#080808]/90 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800">
                    <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="relative w-8 h-8 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0D0D0D] flex items-center justify-center" style={{ borderRadius: 8 }}>
                                <Home size={14} className="text-black dark:text-white" strokeWidth={2} />
                                <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-600 border border-zinc-50 dark:border-[#080808]"
                                    style={{ animation: "hf-pulse 2s ease infinite" }} />
                            </div>
                            <div>
                                <p className="font-mono text-[7px] font-black tracking-[0.45em] uppercase text-zinc-400 dark:text-zinc-600 leading-none mb-0.5">
                                    Following_Feed
                                </p>
                                <h1 className="font-mono text-[15px] font-black text-black dark:text-white uppercase tracking-[0.1em] leading-none">
                                    Home
                                </h1>
                            </div>
                        </div>
                        {posts.length > 0 && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#0D0D0D] border border-zinc-200 dark:border-zinc-800" style={{ borderRadius: 8 }}>
                                <LiveDot />
                                <span className="font-mono text-[8px] font-black tracking-[0.2em] uppercase text-zinc-500 dark:text-zinc-400">
                                    {String(posts.length).padStart(3, "0")}_posts
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Body: centered feed + sidebar ── */}
                <div className="max-w-5xl mx-auto px-6 py-8">
                    <div className="flex gap-8 justify-center">

                        {/* Feed — fixed width, truly centered on small screens */}
                        <div className="w-full max-w-[520px] space-y-5 shrink-0">

                            {loading && (
                                <><PostSkeleton delay={0} /><PostSkeleton delay={0.08} /><PostSkeleton delay={0.16} /></>
                            )}

                            {!loading && error && !posts.length && (
                                <div className="relative overflow-hidden bg-white dark:bg-[#0D0D0D] border border-red-200 dark:border-red-900/50 p-10 text-center" style={{ borderRadius: 20 }}>
                                    <div className="hf-dot-grid absolute inset-0 opacity-[0.03] pointer-events-none text-red-600" />
                                    <div className="relative z-10 space-y-3">
                                        <p className="font-mono text-[8px] font-black tracking-[0.4em] uppercase text-red-600">Signal_Lost</p>
                                        <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">{error}</p>
                                        <button onClick={retry}
                                            className="font-mono text-[9px] font-black tracking-[0.25em] uppercase px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black hover:bg-red-600 hover:text-white transition-colors"
                                            style={{ borderRadius: 8 }}>
                                            Retry_Connection
                                        </button>
                                    </div>
                                </div>
                            )}

                            {!loading && !error && posts.length === 0 && (
                                <div className="relative overflow-hidden bg-white dark:bg-[#0D0D0D] border border-zinc-200 dark:border-zinc-800 py-24 px-8 text-center" style={{ borderRadius: 20 }}>
                                    <div className="hf-dot-grid absolute inset-0 opacity-[0.025] dark:opacity-[0.045] pointer-events-none text-black dark:text-white" />
                                    <div className="hf-scan" />
                                    <div className="relative z-10 space-y-3">
                                        <div className="inline-flex items-center justify-center w-14 h-14 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 mb-2" style={{ borderRadius: 14 }}>
                                            <Home size={22} className="text-zinc-300 dark:text-zinc-700" strokeWidth={1.5} />
                                        </div>
                                        <p className="font-mono text-[8px] font-black tracking-[0.45em] uppercase text-zinc-400 dark:text-zinc-600">Feed_Empty</p>
                                        <p className="font-mono text-[13px] font-black text-black dark:text-white uppercase tracking-[0.07em]">No_Transmissions</p>
                                        <p className="font-mono text-[10px] text-zinc-400 dark:text-zinc-600 tracking-[0.08em]">Follow accounts to receive signals</p>
                                    </div>
                                </div>
                            )}

                            {posts.map((post, i) => (
                                <PostCard key={post._id} post={post} index={i} />
                            ))}

                            {!loading && posts.length > 0 && (
                                <div className="py-6 flex items-center gap-3">
                                    <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                                    <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-[#0D0D0D] border border-zinc-200 dark:border-zinc-800" style={{ borderRadius: 6 }}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-600" style={{ animation: "hf-pulse 2s ease infinite" }} />
                                        <span className="font-mono text-[7px] font-black tracking-[0.3em] uppercase text-zinc-400 dark:text-zinc-600">End_of_Feed</span>
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-600" style={{ animation: "hf-pulse 2s ease infinite .5s" }} />
                                    </div>
                                    <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                                </div>
                            )}
                        </div>

                        {/* Sidebar — only on xl+ */}
                        <div className="w-64 shrink-0 hidden xl:block">
                            <SuggestionsPanel />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}