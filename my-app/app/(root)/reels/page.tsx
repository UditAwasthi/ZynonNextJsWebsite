"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, Play, Pause, VolumeX, Volume2, Film, Share2, Check } from "lucide-react";
import { getReelsFeed, type FeedPost } from "../../../src/lib/api/feedApi";
import { toggleLike } from "../../../src/lib/api/postApi";
import { cache } from "../../../src/lib/cache";

const CACHE_TTL = 3 * 60_000;
const reelsCacheKey = (cursor?: string) => `feed:reels:${cursor ?? "first"}`;

// ─── Global CSS ───────────────────────────────────────────────────────────────
const GCSS = `
@keyframes rl-scan   { 0%{transform:translateY(-100%)} 100%{transform:translateY(2000%)} }
@keyframes rl-pulse  { 0%,100%{opacity:.9;transform:scale(1)} 50%{opacity:.3;transform:scale(.65)} }
@keyframes rl-ping   { 0%{transform:scale(1);opacity:.8} 100%{transform:scale(2.2);opacity:0} }
@keyframes rl-pop    { 0%{transform:scale(1)} 35%{transform:scale(1.4)} 65%{transform:scale(.88)} 100%{transform:scale(1)} }
@keyframes rl-toast  { 0%{opacity:0;transform:translateY(6px)} 15%{opacity:1;transform:translateY(0)} 75%{opacity:1} 100%{opacity:0;transform:translateY(-4px)} }
@keyframes rl-shimmer{ from{background-position:200% 0} to{background-position:-200% 0} }

.rl-dot-grid {
  background-image: radial-gradient(circle, rgba(255,255,255,0.055) 0.7px, transparent 0.7px);
  background-size: 14px 14px;
}
.rl-scan-line {
  position: absolute; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,0,0,0.45), transparent);
  animation: rl-scan 5s linear infinite;
  pointer-events: none; z-index: 5;
}
.rl-heart-pop  { animation: rl-pop .38s cubic-bezier(.34,1.56,.64,1) both; }
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;

function fmtCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
}

function LiveDot({ size = 6 }: { size?: number }) {
    return (
        <div className="relative shrink-0" style={{ width: size, height: size }}>
            <div className="absolute inset-0 rounded-full bg-red-600" style={{ animation: "rl-pulse 1.8s ease infinite" }} />
            <div className="absolute inset-0 rounded-full bg-red-600" style={{ animation: "rl-ping 1.8s ease infinite" }} />
        </div>
    );
}

// ─── Single Reel ──────────────────────────────────────────────────────────────
function ReelItem({ reel, isActive, index }: { reel: FeedPost; isActive: boolean; index: number }) {
    const videoRef        = useRef<HTMLVideoElement>(null);  // mobile
    const videoRefDesktop = useRef<HTMLVideoElement>(null);  // desktop

    // Helper — returns whichever video element is currently visible
    const getVid = () => videoRef.current ?? videoRefDesktop.current;    const [playing,   setPlaying]   = useState(false);
    const [muted,     setMuted]     = useState(false);
    const [liked,     setLiked]     = useState(false);
    const [likeCount, setLikeCount] = useState(reel.likesCount);
    const [liking,    setLiking]    = useState(false);
    const [likeAnim,  setLikeAnim]  = useState(false);
    const [showCtrl,  setShowCtrl]  = useState(false);
    const [copied,    setCopied]    = useState(false);
    const [progress,  setProgress]  = useState(0);
    // Sync muted to both video elements when state changes
    useEffect(() => {
        if (videoRef.current)        videoRef.current.muted        = muted;
        if (videoRefDesktop.current) videoRefDesktop.current.muted = muted;
    }, [muted]);

    const ctrlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const media = reel.media?.[0];

    useEffect(() => {
        const vid = videoRef.current;
        const vidD = videoRefDesktop.current;
        if (isActive) {
            vid?.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
            vidD?.play().catch(() => {});
        } else {
            if (vid)  { vid.pause();  vid.currentTime  = 0; }
            if (vidD) { vidD.pause(); vidD.currentTime = 0; }
            setPlaying(false);
            setProgress(0);
        }
    }, [isActive]);

    useEffect(() => {
        const onTime = (vid: HTMLVideoElement) => () => {
            if (vid.duration) setProgress((vid.currentTime / vid.duration) * 100);
        };
        const vids = [videoRef.current, videoRefDesktop.current].filter(Boolean) as HTMLVideoElement[];
        const handlers = vids.map(v => { const h = onTime(v); v.addEventListener("timeupdate", h); return { v, h }; });
        return () => handlers.forEach(({ v, h }) => v.removeEventListener("timeupdate", h));
    }, []);

    const togglePlay = () => {
        const vid = getVid();
        if (!vid) return;
        if (playing) { vid.pause(); setPlaying(false); }
        else { vid.play().then(() => setPlaying(true)).catch(() => {}); }
        setShowCtrl(true);
        if (ctrlTimer.current) clearTimeout(ctrlTimer.current);
        ctrlTimer.current = setTimeout(() => setShowCtrl(false), 900);
    };

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (liking) return;
        setLiking(true);
        const was = liked;
        setLiked(!was);
        setLikeCount(p => was ? p - 1 : p + 1);
        if (!was) { setLikeAnim(true); setTimeout(() => setLikeAnim(false), 420); }
        try { await toggleLike(reel._id, "Post"); }
        catch { setLiked(was); setLikeCount(p => was ? p + 1 : p - 1); }
        finally { setLiking(false); }
    };

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        try { navigator.clipboard?.writeText(`${window.location.origin}/posts/${reel._id}`); } catch {}
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="w-full h-[calc(100dvh-7.5rem)] md:h-screen bg-black flex items-center justify-center relative overflow-hidden">
            <div className="rl-dot-grid absolute inset-0 pointer-events-none z-0" />
            <div className="rl-scan-line" />

            {/* ─────────────────────────────────────────────────────────────────
                Single <video> — positioned to fill screen on mobile,
                constrained card on desktop. CSS handles both.
            ───────────────────────────────────────────────────────────────── */}

            {/* VIDEO LAYER — absolute full-screen on mobile, hidden on desktop */}
            <div
                className="md:hidden absolute inset-0 z-10 cursor-pointer"
                onClick={togglePlay}
            >
                {media?.url ? (
                    <video
                        ref={videoRef}
                        src={media.url}
                        className="w-full h-full object-cover"
                        loop muted={muted} playsInline preload="metadata"
                    />
                ) : (
                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                        <Film size={36} className="text-zinc-700" strokeWidth={1.5} />
                    </div>
                )}

                {/* Corner accents */}
                <div className="absolute top-0 left-0 w-px h-14 bg-gradient-to-b from-red-600/80 to-transparent z-20 pointer-events-none" />
                <div className="absolute top-0 left-0 h-px w-14 bg-gradient-to-r from-red-600/80 to-transparent z-20 pointer-events-none" />

                {/* Play/pause flash */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 transition-opacity duration-300" style={{ opacity: showCtrl ? 1 : 0 }}>
                    <div className="w-16 h-16 flex items-center justify-center border border-white/15" style={{ borderRadius: 14, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }}>
                        {playing ? <Pause size={24} fill="white" className="text-white" /> : <Play size={24} fill="white" className="text-white ml-1" />}
                    </div>
                </div>

                {/* Bottom gradient */}
                <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-10" style={{ height: "60%", background: "linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.35) 55%, transparent 100%)" }} />

                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none" style={{ height: 2 }}>
                    <div className="h-full bg-zinc-800" />
                    <div className="absolute top-0 left-0 h-full bg-red-600" style={{ width: `${progress}%`, boxShadow: "0 0 6px rgba(255,0,0,0.7)", transition: "none" }} />
                </div>
            </div>

            {/* ── Mobile overlays (author, actions) ── */}
            <div className="md:hidden absolute inset-0 z-20 pointer-events-none">

                {/* Bottom-left: chip + author + caption */}
                <div className="absolute bottom-6 left-4 right-20 pointer-events-none">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-1.5 px-2 py-1 border border-white/10" style={{ borderRadius: 6, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}>
                            <LiveDot size={5} />
                            <span className="font-mono text-[7px] font-black tracking-[0.3em] uppercase text-white/50">REEL_{String(index + 1).padStart(2, "0")}</span>
                        </div>
                    </div>
                    <Link href={`/profile/${reel.author.username}`} className="inline-flex items-center gap-2 mb-2 pointer-events-auto group" onClick={e => e.stopPropagation()}>
                        <div className="w-8 h-8 overflow-hidden border border-white/20 bg-zinc-900 shrink-0 flex items-center justify-center" style={{ borderRadius: 8 }}>
                            {reel.author.profilePicture
                                ? <Image src={reel.author.profilePicture} alt={reel.author.username} width={32} height={32} className="w-full h-full object-cover" unoptimized />
                                : <span className="font-mono text-[9px] font-black text-white uppercase">{reel.author.username.slice(0, 2)}</span>
                            }
                        </div>
                        <div>
                            <p className="font-mono text-[12px] font-black text-white uppercase tracking-[0.1em] leading-none group-hover:text-red-400 transition-colors">{reel.author.username}</p>
                            <p className="font-mono text-[7px] text-white/40 tracking-[0.2em] uppercase mt-0.5">Creator</p>
                        </div>
                    </Link>
                    {reel.caption && <p className="font-mono text-[11px] text-white/65 leading-relaxed line-clamp-2">{reel.caption}</p>}
                </div>

                {/* Right-side action bar */}
                <div className="absolute right-3 bottom-8 flex flex-col items-center gap-5 pointer-events-auto">
                    <button onClick={handleLike} disabled={liking} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
                        <Heart size={28} strokeWidth={liked ? 0 : 1.75} fill={liked ? "#ef4444" : "none"}
                            className={`drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] ${liked ? "text-red-500 drop-shadow-[0_0_10px_rgba(255,0,0,0.7)]" : "text-white"} ${likeAnim ? "rl-heart-pop" : ""}`} />
                        <span className="font-mono text-[10px] font-black text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] tabular-nums">{fmtCount(likeCount)}</span>
                    </button>
                    <Link href={`/posts/${reel._id}`} className="flex flex-col items-center gap-1 active:scale-90 transition-transform" onClick={e => e.stopPropagation()}>
                        <MessageCircle size={27} strokeWidth={1.75} className="text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" />
                        <span className="font-mono text-[10px] font-black text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] tabular-nums">{fmtCount(reel.commentsCount)}</span>
                    </Link>
                    <button onClick={handleShare} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
                        {copied ? <Check size={26} strokeWidth={2.5} className="text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]" /> : <Share2 size={26} strokeWidth={1.75} className="text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" />}
                        <span className={`font-mono text-[10px] font-black drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] ${copied ? "text-green-400" : "text-white"}`}>{copied ? "Done" : "Share"}</span>
                    </button>
                    <button onClick={e => { e.stopPropagation(); setMuted(m => !m); }} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
                        {muted ? <VolumeX size={26} strokeWidth={1.75} className="text-white/50 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" /> : <Volume2 size={26} strokeWidth={1.75} className="text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" />}
                    </button>
                </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────────
                DESKTOP (md+) — constrained video card + sidebar action bar
            ───────────────────────────────────────────────────────────────── */}
            <div className="hidden md:flex relative items-end gap-3 z-10" style={{ height: "min(calc(100dvh - 32px), 800px)" }}>

                {/* Desktop video card */}
                <div
                    className="relative bg-zinc-950 overflow-hidden flex-shrink-0 border border-zinc-800"
                    style={{ aspectRatio: "9/16", height: "100%", borderRadius: 16, maxWidth: "calc(min(calc(100dvh - 32px), 800px) * 9 / 16)" }}
                    onClick={togglePlay}
                >
                    <div className="absolute top-0 left-0 w-px h-14 bg-gradient-to-b from-red-600/80 to-transparent z-20 pointer-events-none" />
                    <div className="absolute top-0 left-0 h-px w-14 bg-gradient-to-r from-red-600/80 to-transparent z-20 pointer-events-none" />
                    <div className="absolute top-0 right-0 w-px h-14 bg-gradient-to-b from-white/10 to-transparent z-20 pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-px h-14 bg-gradient-to-t from-red-600/20 to-transparent z-20 pointer-events-none" />

                    {media?.url ? (
                        <video
                            ref={videoRefDesktop}
                            src={media.url}
                            className="w-full h-full object-cover cursor-pointer"
                            loop muted={muted} playsInline preload="metadata"
                        />
                    ) : (
                        <div className="w-full h-full bg-zinc-900 flex items-center justify-center cursor-pointer">
                            <Film size={36} className="text-zinc-700" strokeWidth={1.5} />
                        </div>
                    )}

                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 transition-opacity duration-300" style={{ opacity: showCtrl ? 1 : 0 }}>
                        <div className="w-16 h-16 flex items-center justify-center border border-white/15" style={{ borderRadius: 14, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }}>
                            {playing ? <Pause size={24} fill="white" className="text-white" /> : <Play size={24} fill="white" className="text-white ml-1" />}
                        </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-10" style={{ height: "55%", background: "linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.4) 55%, transparent 100%)" }} />

                    <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-5 pointer-events-none">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="flex items-center gap-1.5 px-2 py-1 border border-white/10" style={{ borderRadius: 6, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}>
                                <LiveDot size={5} />
                                <span className="font-mono text-[7px] font-black tracking-[0.3em] uppercase text-white/50">REEL_{String(index + 1).padStart(2, "0")}</span>
                            </div>
                        </div>
                        <Link href={`/profile/${reel.author.username}`} className="inline-flex items-center gap-2 mb-2 pointer-events-auto group" onClick={e => e.stopPropagation()}>
                            <div className="w-8 h-8 overflow-hidden border border-white/20 bg-zinc-900 shrink-0 flex items-center justify-center" style={{ borderRadius: 8 }}>
                                {reel.author.profilePicture
                                    ? <Image src={reel.author.profilePicture} alt={reel.author.username} width={32} height={32} className="w-full h-full object-cover" unoptimized />
                                    : <span className="font-mono text-[9px] font-black text-white uppercase">{reel.author.username.slice(0, 2)}</span>
                                }
                            </div>
                            <div>
                                <p className="font-mono text-[11px] font-black text-white uppercase tracking-[0.1em] leading-none group-hover:text-red-400 transition-colors">{reel.author.username}</p>
                                <p className="font-mono text-[7px] text-white/40 tracking-[0.2em] uppercase mt-0.5">Creator</p>
                            </div>
                        </Link>
                        {reel.caption && <p className="font-mono text-[10px] text-white/65 leading-relaxed line-clamp-2 pointer-events-none">{reel.caption}</p>}
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none" style={{ height: 2 }}>
                        <div className="h-full bg-zinc-800" />
                        <div className="absolute top-0 left-0 h-full bg-red-600" style={{ width: `${progress}%`, boxShadow: "0 0 6px rgba(255,0,0,0.7)", transition: "none" }} />
                    </div>
                </div>

                {/* Desktop action bar */}
                <div className="flex flex-col items-center gap-4 pb-6 shrink-0">
                    <button onClick={handleLike} disabled={liking} className="flex flex-col items-center gap-1.5 group active:scale-90 transition-transform">
                        <div className="w-11 h-11 flex items-center justify-center border transition-all duration-200" style={{ borderRadius: 12, borderColor: liked ? "rgba(239,68,68,0.4)" : "rgba(63,63,70,1)", background: liked ? "rgba(239,68,68,0.12)" : "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
                            <Heart size={20} strokeWidth={liked ? 0 : 1.5} fill={liked ? "#ef4444" : "none"} className={`${liked ? "text-red-500 drop-shadow-[0_0_8px_rgba(255,0,0,0.6)]" : "text-white"} ${likeAnim ? "rl-heart-pop" : ""}`} />
                        </div>
                        <span className="font-mono text-[9px] font-black text-white/50 tabular-nums">{fmtCount(likeCount)}</span>
                    </button>
                    <Link href={`/posts/${reel._id}`} className="flex flex-col items-center gap-1.5 group active:scale-90 transition-transform" onClick={e => e.stopPropagation()}>
                        <div className="w-11 h-11 flex items-center justify-center border border-zinc-800 group-hover:border-zinc-600 transition-colors" style={{ borderRadius: 12, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
                            <MessageCircle size={20} strokeWidth={1.5} className="text-white" />
                        </div>
                        <span className="font-mono text-[9px] font-black text-white/50 tabular-nums">{fmtCount(reel.commentsCount)}</span>
                    </Link>
                    <button onClick={handleShare} className="flex flex-col items-center gap-1.5 group active:scale-90 transition-transform">
                        <div className="w-11 h-11 flex items-center justify-center border transition-all duration-200" style={{ borderRadius: 12, borderColor: copied ? "rgba(34,197,94,0.5)" : "rgba(63,63,70,1)", background: copied ? "rgba(34,197,94,0.1)" : "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
                            {copied ? <Check size={18} strokeWidth={2.5} className="text-green-400" /> : <Share2 size={18} strokeWidth={1.5} className="text-white" />}
                        </div>
                        <span className={`font-mono text-[9px] font-black tabular-nums transition-colors ${copied ? "text-green-400" : "text-white/50"}`}>{copied ? "Done" : "Share"}</span>
                    </button>
                    <button onClick={e => { e.stopPropagation(); setMuted(m => !m); }} className="flex flex-col items-center gap-1.5 group active:scale-90 transition-transform">
                        <div className="w-11 h-11 flex items-center justify-center border border-zinc-800 group-hover:border-zinc-600 transition-colors" style={{ borderRadius: 12, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
                            {muted ? <VolumeX size={18} strokeWidth={1.5} className="text-white/40" /> : <Volume2 size={18} strokeWidth={1.5} className="text-white" />}
                        </div>
                        <span className="font-mono text-[9px] font-black text-white/50">{muted ? "Off" : "On"}</span>
                    </button>
                </div>
            </div>

            {/* Copied toast — both breakpoints */}
            {copied && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 border border-green-500/30 bg-black/90 backdrop-blur-xl" style={{ borderRadius: 10, animation: "rl-toast 2s ease forwards" }}>
                    <Check size={11} className="text-green-400" strokeWidth={2.5} />
                    <span className="font-mono text-[9px] font-black tracking-[0.2em] uppercase text-green-400">Link_Copied</span>
                </div>
            )}
        </div>
    );
}

// ─── Cached fetch ─────────────────────────────────────────────────────────────
interface ReelsPage { reels: FeedPost[]; nextCursor: string | null; }

async function fetchReelsPage(cursor?: string): Promise<ReelsPage> {
    const key = reelsCacheKey(cursor);
    const cached = cache.get<ReelsPage>(key);
    if (cached) return cached;
    const res = await getReelsFeed(cursor);
    const { reels, nextCursor } = res.data.data;
    const page: ReelsPage = { reels: Array.isArray(reels) ? reels : [], nextCursor: nextCursor ?? null };
    cache.set(key, page, CACHE_TTL);
    return page;
}

// ─── Loading screen ───────────────────────────────────────────────────────────
function LoadingScreen() {
    return (
        <div className="h-[calc(100dvh-7.5rem)] md:h-screen bg-black flex flex-col items-center justify-center gap-5">
            <div className="rl-dot-grid absolute inset-0 pointer-events-none" />
            <div className="relative grid grid-cols-3 gap-[6px]">
                {[...Array(9)].map((_, i) => (
                    <div key={i} className={`w-[7px] h-[7px] rounded-full ${i === 4 ? "bg-red-600" : "bg-zinc-800"}`}
                        style={{ animation: "rl-pulse 1.2s ease infinite", animationDelay: `${i * 0.08}s` }} />
                ))}
            </div>
            <p className="font-mono text-[8px] font-black tracking-[0.5em] uppercase text-zinc-600">Loading_Reels</p>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ReelsPage() {
    const [reels,       setReels]       = useState<FeedPost[]>([]);
    const [cursor,      setCursor]      = useState<string | null>(null);
    const [hasMore,     setHasMore]     = useState(true);
    const [loading,     setLoading]     = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [error,       setError]       = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const fetchedRef   = useRef(false);

    const loadFirstPage = useCallback(async () => {
        try {
            const stale = cache.getStale<ReelsPage>(reelsCacheKey());
            if (stale?.reels.length) {
                setReels(stale.reels);
                setCursor(stale.nextCursor);
                setHasMore(!!stale.nextCursor);
                setLoading(false);
            }
            const page = await fetchReelsPage();
            setReels(page.reels);
            setCursor(page.nextCursor);
            setHasMore(!!page.nextCursor);
        } catch { setError("Signal lost."); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        if (fetchedRef.current) return;
        fetchedRef.current = true;
        loadFirstPage();
    }, [loadFirstPage]);

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
        slides.forEach(s => observer.observe(s));
        return () => observer.disconnect();
    }, [reels.length, cursor, hasMore, loadingMore]);

    const retry = () => {
        cache.invalidate(reelsCacheKey());
        fetchedRef.current = false;
        setError(null); setLoading(true);
        loadFirstPage();
    };

    if (loading && reels.length === 0) return <><style>{GCSS}</style><LoadingScreen /></>;

    if (error) return (
        <>
            <style>{GCSS}</style>
            <div className="h-[calc(100dvh-7.5rem)] md:h-screen bg-black flex flex-col items-center justify-center gap-4 relative">
                <div className="rl-dot-grid absolute inset-0 pointer-events-none" />
                <div className="relative z-10 text-center space-y-3">
                    <p className="font-mono text-[8px] font-black tracking-[0.4em] uppercase text-red-600">Signal_Lost</p>
                    <p className="font-mono text-[11px] text-zinc-500">{error}</p>
                    <button onClick={retry} className="font-mono text-[9px] font-black tracking-[0.25em] uppercase px-5 py-2.5 bg-white text-black hover:bg-red-600 hover:text-white transition-colors" style={{ borderRadius: 8 }}>
                        Retry_Connection
                    </button>
                </div>
            </div>
        </>
    );

    if (reels.length === 0) return (
        <>
            <style>{GCSS}</style>
            <div className="h-[calc(100dvh-7.5rem)] md:h-screen bg-black flex flex-col items-center justify-center gap-5 relative">
                <div className="rl-dot-grid absolute inset-0 pointer-events-none" />
                <div className="relative z-10 w-14 h-14 border border-zinc-800 flex items-center justify-center" style={{ borderRadius: 14 }}>
                    <Film size={20} strokeWidth={1.5} className="text-zinc-700" />
                </div>
                <div className="relative z-10 text-center">
                    <p className="font-mono text-[8px] font-black tracking-[0.4em] uppercase text-zinc-600 mb-1">No_Transmissions</p>
                    <p className="font-mono text-[12px] font-black text-white uppercase tracking-[0.07em]">Feed Empty</p>
                </div>
            </div>
        </>
    );

    return (
        <>
            <style>{GCSS}</style>

            <div className="relative h-[calc(100dvh-7.5rem)] md:h-screen bg-black overflow-hidden">

                {/* ── Top HUD ── */}
                <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
                    <div className="flex items-center justify-between px-6 pt-5 pb-2">
                        <div className="flex items-center gap-2.5">
                            <div className="w-px h-4 bg-red-600/60 shrink-0" />
                            <div>
                                <p className="font-mono text-[7px] font-black tracking-[0.45em] uppercase text-white/25 leading-none">Zynon</p>
                                <p className="font-mono text-[14px] font-black text-white uppercase tracking-[0.1em] leading-none mt-0.5">Reels</p>
                            </div>
                        </div>
                        <div
                            className="flex items-center gap-2 px-3 py-1.5 border border-white/10"
                            style={{ borderRadius: 8, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}
                        >
                            <LiveDot size={5} />
                            <span className="font-mono text-[8px] font-black text-white/40 tabular-nums tracking-[0.15em]">
                                {String(activeIndex + 1).padStart(2, "0")}/{String(reels.length).padStart(2, "0")}
                            </span>
                        </div>
                    </div>

                    {/* Progress dots */}
                    <div className="flex items-center justify-center gap-1 pb-1">
                        {reels.slice(0, Math.min(reels.length, 14)).map((_, i) => (
                            <div key={i} className="rounded-full transition-all duration-300" style={{
                                width:  i === activeIndex ? 18 : 4,
                                height: 3,
                                background: i === activeIndex ? "#ef4444" : "rgba(255,255,255,0.18)",
                                boxShadow: i === activeIndex ? "0 0 6px rgba(255,0,0,0.6)" : "none",
                            }} />
                        ))}
                    </div>
                </div>

                {/* ── Scroll container ── */}
                <div ref={containerRef} className="h-full overflow-y-scroll no-scrollbar" style={{ scrollSnapType: "y mandatory" }}>
                    {reels.map((reel, i) => (
                        <div key={reel._id} data-reel-index={i} className="w-full h-[calc(100dvh-7.5rem)] md:h-screen" style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}>
                            <ReelItem reel={reel} isActive={activeIndex === i} index={i} />
                        </div>
                    ))}

                    {loadingMore && (
                        <div className="w-full h-[calc(100dvh-7.5rem)] md:h-screen bg-black flex items-center justify-center" style={{ scrollSnapAlign: "start" }}>
                            <div className="grid grid-cols-3 gap-[5px]">
                                {[...Array(9)].map((_, i) => (
                                    <div key={i} className={`w-[5px] h-[5px] rounded-full ${i === 4 ? "bg-red-600" : "bg-zinc-800"}`}
                                        style={{ animation: "rl-pulse 1.2s ease infinite", animationDelay: `${i * 0.08}s` }} />
                                ))}
                            </div>
                        </div>
                    )}

                    {!hasMore && !loadingMore && reels.length > 0 && (
                        <div className="w-full h-[calc(100dvh-7.5rem)] md:h-screen bg-black flex flex-col items-center justify-center gap-4 relative" style={{ scrollSnapAlign: "start" }}>
                            <div className="rl-dot-grid absolute inset-0 pointer-events-none" />
                            <div className="relative z-10 flex items-center gap-3">
                                <div className="h-px w-8 bg-zinc-800" />
                                <div className="w-1.5 h-1.5 rounded-full bg-red-600" style={{ animation: "rl-pulse 2s ease infinite" }} />
                                <div className="h-px w-8 bg-zinc-800" />
                            </div>
                            <p className="relative z-10 font-mono text-[8px] font-black tracking-[0.4em] uppercase text-zinc-700">All_Reels_Watched</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}