"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Home, ImageOff, Play, Wifi, Share2, User, Bookmark, Pause, VolumeX, Volume2, Check } from "lucide-react";
import { getHomeFeed, type FeedPost } from "../../../src/lib/api/feedApi";
import { toggleLike } from "../../../src/lib/api/postApi";
import { cache, swr } from "../../../src/lib/cache";

const CACHE_KEY = "feed:home";
const CACHE_TTL = 2 * 60_000;

// ─── Profile picture cache ────────────────────────────────────────────────────
const picCache    = new Map<string, string | null>();
const picInflight = new Map<string, Promise<string | null>>();

async function fetchProfilePic(username: string): Promise<string | null> {
    if (picCache.has(username)) return picCache.get(username)!;
    if (picInflight.has(username)) return picInflight.get(username)!;
    const base = process.env.NEXT_PUBLIC_API_BASE || "https://zynon.onrender.com/api/";
    let token: string | null = null;
    try { token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null; } catch {}
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    const promise = fetch(`${base}profile/${username}`, { headers })
        .then(r => r.ok ? r.json() : null)
        .then(json => {
            const pic: string | null = json?.data?.profile?.profilePicture ?? null;
            picCache.set(username, pic); picInflight.delete(username); return pic;
        })
        .catch(() => { picCache.set(username, null); picInflight.delete(username); return null; });
    picInflight.set(username, promise);
    return promise;
}

function useProfilePic(username: string): string | null {
    const [pic, setPic] = useState<string | null>(() => picCache.get(username) ?? null);
    useEffect(() => {
        if (picCache.has(username)) { setPic(picCache.get(username) ?? null); return; }
        fetchProfilePic(username).then(setPic);
    }, [username]);
    return pic;
}

// ─── Global CSS — unchanged ───────────────────────────────────────────────────
const GCSS = `
@keyframes hf-scan    { 0%{transform:translateY(-100%)} 100%{transform:translateY(800%)} }
@keyframes hf-pulse   { 0%,100%{opacity:.8;transform:scale(1)} 50%{opacity:.4;transform:scale(.92)} }
@keyframes hf-ping    { 0%{transform:scale(1);opacity:.4} 100%{transform:scale(2.2);opacity:0} }
@keyframes hf-in      { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
@keyframes hf-shimmer { from{background-position:200% 0} to{background-position:-200% 0} }
@keyframes hf-like    { 0%{transform:scale(1)} 30%{transform:scale(1.4)} 60%{transform:scale(.85)} 100%{transform:scale(1)} }
.hf-skel {
  background: linear-gradient(90deg,rgba(0,0,0,0.04) 25%,rgba(0,0,0,0.08) 50%,rgba(0,0,0,0.04) 75%);
  background-size: 400% 100%; animation: hf-shimmer 1.8s ease-in-out infinite;
}
.dark .hf-skel {
  background: linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.07) 50%,rgba(255,255,255,0.03) 75%);
  background-size: 400% 100%;
}
.hf-dot-grid { background-image: radial-gradient(circle, currentColor 0.5px, transparent 0.5px); background-size: 24px 24px; }
.hf-liked { animation: hf-like .45s cubic-bezier(.34,1.56,.64,1) both; }
.hf-scan {
  position:absolute; left:0; right:0; height:120px;
  background: linear-gradient(to bottom, transparent, rgba(59,130,246,0.08), transparent);
  animation: hf-scan 6s ease-in-out infinite; pointer-events:none; z-index:2;
}
.hf-action { transition: all .2s cubic-bezier(.2,.8,.2,1); }
.hf-action:hover { transform: translateY(-2px) scale(1.1); }
.hf-action:active { transform: scale(.92); }
::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.1);border-radius:10px}
.dark ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.05)}
`;

function timeAgo(d: string): string {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return `${s}s`; if (s < 3600) return `${Math.floor(s/60)}m`;
    if (s < 86400) return `${Math.floor(s/3600)}h`; if (s < 604800) return `${Math.floor(s/86400)}d`;
    return `${Math.floor(s/604800)}w`;
}
function fmtCount(n: number): string {
    if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n/1_000).toFixed(1)}K`;
    return String(n);
}
function LiveDot() {
    return (
        <div className="relative shrink-0 w-2 h-2">
            <div className="absolute inset-0 rounded-full bg-red-600" style={{animation:"hf-pulse 1.8s ease infinite"}} />
            <div className="absolute inset-0 rounded-full bg-red-600" style={{animation:"hf-ping 1.8s ease infinite"}} />
        </div>
    );
}

// ─── Video Player — natural ratio, no crop ────────────────────────────────────
function VideoPlayer({ src }: { src: string }) {
    const vRef  = useRef<HTMLVideoElement>(null);
    const tRef  = useRef<ReturnType<typeof setTimeout>|null>(null);
    const [playing, setPlaying] = useState(false);
    const [muted,   setMuted]   = useState(true);
    const [prog,    setProg]    = useState(0);
    const [icon,    setIcon]    = useState(false);
    const [over,    setOver]    = useState(false);

    useEffect(() => { if (vRef.current) vRef.current.muted = muted; }, [muted]);
    useEffect(() => {
        const v = vRef.current; if (!v) return;
        const h = () => { if (v.duration) setProg((v.currentTime/v.duration)*100); };
        v.addEventListener("timeupdate", h);
        return () => v.removeEventListener("timeupdate", h);
    }, []);

    const toggle = () => {
        const v = vRef.current; if (!v) return;
        if (playing) { v.pause(); setPlaying(false); } else { v.play().then(()=>setPlaying(true)).catch(()=>{}); }
        setIcon(true); if (tRef.current) clearTimeout(tRef.current);
        tRef.current = setTimeout(() => setIcon(false), 700);
    };

    return (
        <div className="relative w-full bg-black overflow-hidden cursor-pointer select-none" style={{borderRadius:16}}
            onClick={toggle} onMouseEnter={()=>setOver(true)} onMouseLeave={()=>setOver(false)}>
            {/* h-auto = natural height, no crop. max-h caps extreme portrait ~4:5 */}
            <video ref={vRef} src={src} className="w-full h-auto max-h-[580px] object-contain block"
                loop muted={muted} playsInline preload="metadata" />
            {icon && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="flex items-center justify-center" style={{width:56,height:56,borderRadius:"50%",
                        background:"rgba(0,0,0,0.45)",backdropFilter:"blur(10px)",border:"1px solid rgba(255,255,255,0.15)"}}>
                        {playing ? <Pause size={22} fill="white" className="text-white"/> : <Play size={22} fill="white" className="text-white ml-0.5"/>}
                    </div>
                </div>
            )}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none transition-opacity duration-300"
                style={{opacity: over||!playing ? 1 : 0}}>
                <div className="flex items-center gap-1.5 px-2.5 py-1 pointer-events-auto"
                    style={{background:"rgba(0,0,0,0.5)",backdropFilter:"blur(8px)",borderRadius:8}}>
                    <Play size={9} fill="white" className="text-white"/>
                    <span className="font-mono text-[9px] font-bold text-white tracking-widest uppercase">Reel</span>
                </div>
                <button className="flex items-center justify-center pointer-events-auto"
                    style={{width:30,height:30,borderRadius:"50%",background:"rgba(0,0,0,0.5)",
                        backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,0.1)"}}
                    onClick={e=>{e.stopPropagation();setMuted(m=>!m);}}>
                    {muted ? <VolumeX size={13} className="text-white/70"/> : <Volume2 size={13} className="text-white"/>}
                </button>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/15 z-10">
                <div className="h-full bg-white/70 transition-none" style={{width:`${prog}%`}}/>
            </div>
        </div>
    );
}

// ─── Post Card — OS chrome kept, media fixed ──────────────────────────────────
function PostCard({ post, index }: { post: FeedPost; index: number }) {
    const [liked,    setLiked]    = useState(false);
    const [count,    setCount]    = useState(post.likesCount);
    const [liking,   setLiking]   = useState(false);
    const [saved,    setSaved]    = useState(false);
    const [anim,     setAnim]     = useState(false);
    const [copied,   setCopied]   = useState(false);
    const media   = post.media?.[0];
    const isVideo = media?.type === "video";
    const pic     = useProfilePic(post.author.username);

    const handleLike = async () => {
        if (liking) return; setLiking(true);
        const was = liked; setLiked(!was); setCount(p => was ? p-1 : p+1);
        if (!was) { setAnim(true); setTimeout(()=>setAnim(false),400); }
        try { await toggleLike(post._id,"Post"); }
        catch { setLiked(was); setCount(p => was ? p+1 : p-1); }
        finally { setLiking(false); }
    };
    const handleShare = () => {
        try { navigator.clipboard?.writeText(`${window.location.origin}/posts/${post._id}`); } catch {}
        setCopied(true); setTimeout(()=>setCopied(false),2000);
    };

    return (
        <article className="relative bg-white dark:bg-[#0D0D0D] border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            style={{borderRadius:20, animation:`hf-in .36s cubic-bezier(.32,.72,0,1) ${Math.min(index,5)*0.07}s both`}}>
            {/* OS chrome — all kept exactly as original */}
            <div className="hf-dot-grid absolute inset-0 opacity-[0.025] dark:opacity-[0.045] pointer-events-none text-black dark:text-white"/>
            <div className="hf-scan"/>
            <div className="absolute top-0 left-0 w-px h-12 bg-gradient-to-b from-red-600/70 to-transparent pointer-events-none z-10"/>
            <div className="absolute top-0 left-0 h-px w-12 bg-gradient-to-r from-red-600/70 to-transparent pointer-events-none z-10"/>

            {/* Author row — unchanged */}
            <div className="relative z-10 flex items-center gap-3 px-5 pt-5 pb-4">
                <Link href={`/profile/${post.author.username}`} className="flex items-center gap-3 min-w-0 flex-1 group">
                    <div className="relative shrink-0">
                        <div className="relative w-10 h-10 overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800" style={{borderRadius:10}}>
                            {pic
                                ? <img src={pic} alt={post.author.username} className="absolute inset-0 w-full h-full object-cover"/>
                                : <span className="absolute inset-0 flex items-center justify-center font-mono text-[11px] font-black text-zinc-400 uppercase">{post.author.username.slice(0,2)}</span>
                            }
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-600 border-2 border-white dark:border-[#0D0D0D]"
                            style={{boxShadow:"0 0 8px rgba(255,0,0,0.65)"}}/>
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
                <div className="shrink-0 px-2 py-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800" style={{borderRadius:6}}>
                    <span className="font-mono text-[8px] font-black tracking-[0.2em] text-zinc-400 dark:text-zinc-600">#{String(index+1).padStart(2,"0")}</span>
                </div>
            </div>

            {/* ── Media — ONLY change from original ────────────────────────
                Before: forced aspectRatio "4/5" + object-cover = everything cropped
                After:  h-auto = natural height, max-h caps extreme portrait,
                        object-contain = full image visible, black letterbox for wide
            ──────────────────────────────────────────────────────────────── */}
            <div className="px-4 relative z-10">
                {media?.url ? (
                    isVideo ? (
                        <VideoPlayer src={media.url}/>
                    ) : (
                        <div className="w-full overflow-hidden bg-black" style={{borderRadius:16}}>
                            <img src={media.url} alt={post.caption||"Post"}
                                className="w-full h-auto max-h-[580px] object-contain block"
                                loading="lazy"/>
                        </div>
                    )
                ) : (
                    <div className="w-full aspect-square bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center gap-2.5"
                        style={{borderRadius:16}}>
                        <ImageOff size={22} className="text-zinc-300 dark:text-zinc-700" strokeWidth={1.5}/>
                        <span className="font-mono text-[8px] text-zinc-400 dark:text-zinc-600 tracking-[0.25em] uppercase">No_Media</span>
                    </div>
                )}
            </div>

            {/* Caption — unchanged */}
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

            {/* Actions — unchanged */}
            <div className="relative z-10 flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-5">
                    <button onClick={handleLike} disabled={liking}
                        className={`hf-action flex items-center gap-2 ${liked?"text-red-500":"text-zinc-500 dark:text-zinc-400 hover:text-red-500"}`}>
                        <Heart size={18} strokeWidth={liked?0:1.75} fill={liked?"currentColor":"none"}
                            className={`${liked?"drop-shadow-[0_0_8px_rgba(255,0,0,0.55)]":""} ${anim?"hf-liked":""}`}/>
                        <span className="font-mono text-[11px] font-black tabular-nums">{fmtCount(count)}</span>
                    </button>
                    <Link href={`/posts/${post._id}`}
                        className="hf-action flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white">
                        <MessageCircle size={18} strokeWidth={1.75}/>
                        <span className="font-mono text-[11px] font-black tabular-nums">{fmtCount(post.commentsCount)}</span>
                    </Link>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleShare} className="hf-action text-zinc-400 dark:text-zinc-600 hover:text-black dark:hover:text-white">
                        {copied ? <Check size={16} strokeWidth={2.5} className="text-green-500"/> : <Share2 size={16} strokeWidth={1.75}/>}
                    </button>
                    <button onClick={()=>setSaved(s=>!s)}
                        className={`hf-action ${saved?"text-black dark:text-white":"text-zinc-400 dark:text-zinc-600 hover:text-black dark:hover:text-white"}`}>
                        <Bookmark size={16} strokeWidth={1.75} fill={saved?"currentColor":"none"}/>
                    </button>
                </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-600/15 to-transparent"/>
        </article>
    );
}

// ─── Post Skeleton — matches new card style ───────────────────────────────────
function PostSkeleton({ delay=0 }: { delay?: number }) {
    return (
        <div className="bg-white dark:bg-[#0D0D0D] border border-zinc-100 dark:border-zinc-900 overflow-hidden"
            style={{borderRadius:20, animation:`hf-in .4s ease ${delay}s both`}}>
            <div className="flex items-center gap-3 px-5 pt-5 pb-4">
                <div className="hf-skel w-10 h-10 shrink-0" style={{borderRadius:10}}/>
                <div className="flex-1 space-y-2">
                    <div className="hf-skel h-3 w-32 rounded-full"/>
                    <div className="hf-skel h-2 w-20 rounded-full opacity-60"/>
                </div>
            </div>
            <div className="mx-4 hf-skel aspect-square" style={{borderRadius:16}}/>
            <div className="flex items-center justify-between px-5 py-4">
                <div className="flex gap-5">
                    <div className="hf-skel h-4 w-10 rounded-full"/>
                    <div className="hf-skel h-4 w-10 rounded-full"/>
                </div>
                <div className="flex gap-3">
                    <div className="hf-skel h-4 w-4 rounded"/>
                    <div className="hf-skel h-4 w-4 rounded"/>
                </div>
            </div>
        </div>
    );
}

// ─── Suggestions — completely unchanged ──────────────────────────────────────
interface Suggestion { userId: string; username: string; name: string; profilePicture: string|null; score: number }

async function fetchSuggestions(): Promise<Suggestion[]> {
    const base = process.env.NEXT_PUBLIC_API_BASE || "https://zynon.onrender.com/api/";
    let token: string|null = null;
    try { token = typeof window!=="undefined" ? localStorage.getItem("accessToken") : null; } catch {}
    if (!token) return [];
    const res = await fetch(`${base}suggestions/users-to-follow`,{headers:{Authorization:`Bearer ${token}`,"x-client-type":"web"}});
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : [];
}

function SuggestionItem({ user, index }: { user: Suggestion; index: number }) {
    return (
        <Link href={`/profile/${user.username}`}
            className="flex items-center gap-3 py-3 border-b border-zinc-100 dark:border-zinc-900 last:border-0 group"
            style={{animation:`hf-in .28s cubic-bezier(.32,.72,0,1) ${index*0.06}s both`}}>
            <div className="shrink-0 w-9 h-9 overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800" style={{borderRadius:9}}>
                {user.profilePicture
                    ? <img src={user.profilePicture} alt={user.username} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"/>
                    : <span className="w-full h-full flex items-center justify-center font-mono text-[10px] font-black text-zinc-400 uppercase">{user.username.slice(0,2)}</span>
                }
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-mono text-[10px] font-black text-black dark:text-white uppercase tracking-[0.08em] truncate group-hover:text-red-600 transition-colors">{user.username}</p>
                {user.name && <p className="font-mono text-[8px] text-zinc-400 dark:text-zinc-600 tracking-[0.1em] truncate mt-0.5">{user.name}</p>}
            </div>
            {user.score > 0 && (
                <div className="shrink-0 flex items-center gap-1 px-2 py-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800" style={{borderRadius:6}}>
                    <div className="w-1.5 h-1.5 rounded-full bg-red-600" style={{animation:"hf-pulse 2s ease infinite"}}/>
                    <span className="font-mono text-[8px] font-black text-zinc-500 dark:text-zinc-400">{user.score}</span>
                </div>
            )}
        </Link>
    );
}

function SuggestionSkeleton() {
    return (
        <div className="flex items-center gap-3 py-3 border-b border-zinc-100 dark:border-zinc-900">
            <div className="hf-skel shrink-0 w-9 h-9" style={{borderRadius:9}}/>
            <div className="flex-1 space-y-1.5"><div className="hf-skel h-2.5 w-24 rounded"/><div className="hf-skel h-2 w-16 rounded"/></div>
        </div>
    );
}

function SuggestionsPanel() {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => { fetchSuggestions().then(setSuggestions).finally(()=>setLoading(false)); }, []);

    return (
        <div className="sticky top-24 space-y-4">
            <div className="relative overflow-hidden bg-white/40 dark:bg-white/5 backdrop-blur-2xl ring-1 ring-white/50 dark:ring-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.05)]" style={{borderRadius:32}}>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-transparent pointer-events-none"/>
                <div className="relative z-10 px-5 pt-5 pb-3 border-b border-white/20 dark:border-white/5 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2.5 mb-1"><LiveDot/><span className="text-[10px] font-bold tracking-[0.15em] uppercase text-blue-500 dark:text-blue-400">Suggestions</span></div>
                        <p className="text-[16px] font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Expand Network</p>
                    </div>
                    {!loading&&suggestions.length>0&&<span className="px-2 py-0.5 bg-zinc-900/5 dark:bg-white/5 rounded-full text-[10px] font-bold text-zinc-500 dark:text-zinc-400">{suggestions.length}</span>}
                </div>
                <div className="relative z-10 px-3 py-2">
                    {loading&&[0,1,2,3].map(i=><SuggestionSkeleton key={i}/>)}
                    {!loading&&suggestions.length===0&&(
                        <div className="py-10 text-center">
                            <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-white/5 mx-auto mb-3 flex items-center justify-center"><User size={18} className="text-zinc-400"/></div>
                            <p className="text-[11px] font-bold tracking-wider uppercase text-zinc-400 dark:text-zinc-600">No Suggestions</p>
                        </div>
                    )}
                    {!loading&&suggestions.map((u,i)=><SuggestionItem key={u.userId} user={u} index={i}/>)}
                </div>
                {!loading&&suggestions.length>0&&(
                    <div className="relative z-10 px-5 py-3.5 bg-white/20 dark:bg-black/10">
                        <p className="text-[10px] font-medium tracking-wide text-zinc-500 dark:text-zinc-400">Based on your activity</p>
                    </div>
                )}
            </div>
            <div className="relative overflow-hidden bg-white/40 dark:bg-white/5 backdrop-blur-2xl ring-1 ring-white/50 dark:ring-white/10 px-5 py-5 shadow-lg" style={{borderRadius:28}}>
                <div className="relative z-10 flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black tracking-widest uppercase text-zinc-500 dark:text-zinc-400">Status</span>
                    <div className="p-1.5 bg-green-500/10 rounded-lg"><Wifi size={12} className="text-green-500"/></div>
                </div>
                <div className="space-y-1">
                    {[{label:"Feed Sync",value:"Live"},{label:"Network",value:"Active"},{label:"Signals",value:"Stable"}].map(s=>(
                        <div key={s.label} className="flex items-center justify-between py-2 group">
                            <span className="text-[12px] font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors">{s.label}</span>
                            <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-white/50 dark:bg-white/5 ring-1 ring-black/5 dark:ring-white/5 shadow-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"/>
                                <span className="text-[10px] font-bold text-green-600 dark:text-green-500 uppercase tracking-tighter">{s.value}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Page — unchanged ─────────────────────────────────────────────────────────
export default function HomeFeedPage() {
    const [mounted,  setMounted]  = useState(false);
    const [posts,    setPosts]    = useState<FeedPost[]>([]);
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState<string|null>(null);
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
            async () => { const res = await getHomeFeed(); const d = res.data.data; return Array.isArray(d) ? d : []; },
            (data) => { setPosts(data); setLoading(false); },
            () => { setPosts(p => { if (!p.length) setError("Failed to load feed."); return p; }); setLoading(false); },
            CACHE_TTL,
        );
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!mounted||fetchedRef.current) return;
        fetchedRef.current = true; fetchFeed();
    }, [mounted, fetchFeed]);

    const retry = () => {
        cache.invalidate(CACHE_KEY); fetchedRef.current = false;
        setError(null); setLoading(true); setPosts([]); fetchFeed();
    };

    return (
        <>
            <style>{GCSS}</style>
            <div className="relative min-h-screen bg-white/30 dark:bg-[#050505]/40 backdrop-blur-3xl overflow-hidden transition-colors duration-700">
                <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-[120px] pointer-events-none z-0"/>
                <div className="fixed top-[40%] right-[-10%] w-[400px] h-[400px] bg-purple-500/10 dark:bg-purple-600/10 rounded-full blur-[100px] pointer-events-none z-0"/>

                <div className="sticky top-0 z-30 backdrop-blur-2xl bg-white/40 dark:bg-[#0a0a0c]/40 border-b border-white/30 dark:border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.2)] transition-all">
                    <div className="max-w-5xl mx-auto px-4 md:px-6 py-3.5 flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="relative w-11 h-11 ring-1 ring-white/40 dark:ring-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md flex items-center justify-center rounded-[18px] shadow-sm hover:scale-105 transition-transform duration-300">
                                <Home size={20} className="text-zinc-800 dark:text-zinc-200" strokeWidth={1.5}/>
                                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-[#f8f9fb] dark:border-[#0a0a0c] shadow-[0_0_10px_rgba(34,197,94,0.4)] animate-pulse"/>
                            </div>
                            <div className="flex flex-col justify-center">
                                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-blue-500 dark:text-blue-400 leading-none mb-1">Following Feed</p>
                                <h1 className="text-[19px] font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-none">Home</h1>
                            </div>
                        </div>
                        {posts.length > 0 && (
                            <div className="flex items-center gap-2.5 px-4 py-2 bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[20px] ring-1 ring-white/50 dark:ring-white/10 shadow-sm hover:bg-white/60 dark:hover:bg-white/10 transition-colors">
                                <LiveDot/>
                                <span className="text-[11px] font-bold tracking-widest uppercase text-zinc-600 dark:text-zinc-300">{String(posts.length).padStart(3,"0")} posts</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-6 py-8">
                    <div className="flex gap-8 justify-center">
                        <div className="w-full max-w-[520px] space-y-5 shrink-0">
                            {loading&&<><PostSkeleton delay={0}/><PostSkeleton delay={0.08}/><PostSkeleton delay={0.16}/></>}
                            {!loading&&error&&!posts.length&&(
                                <div className="relative overflow-hidden bg-red-500/10 backdrop-blur-2xl ring-1 ring-red-500/20 p-10 text-center" style={{borderRadius:32}}>
                                    <p className="font-mono text-[11px] font-black tracking-[0.3em] uppercase text-red-500 mb-3">Signal Lost</p>
                                    <p className="text-[14px] font-medium text-zinc-700 dark:text-zinc-200 mb-4">{error}</p>
                                    <button onClick={retry} className="font-mono text-[11px] font-bold tracking-widest uppercase px-6 py-3 bg-red-500 text-white hover:bg-red-600 transition-all active:scale-95" style={{borderRadius:20}}>Retry Connection</button>
                                </div>
                            )}
                            {!loading&&!error&&posts.length===0&&(
                                <div className="relative overflow-hidden bg-white/40 dark:bg-white/5 backdrop-blur-2xl ring-1 ring-white/50 dark:ring-white/10 py-24 px-8 text-center" style={{borderRadius:32}}>
                                    <Home size={26} className="text-zinc-400 dark:text-zinc-500 mx-auto mb-4" strokeWidth={1.5}/>
                                    <p className="font-mono text-[11px] font-black tracking-[0.3em] uppercase text-blue-500 dark:text-blue-400 mb-2">Feed Empty</p>
                                    <h3 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 tracking-tight mb-2">No Transmissions</h3>
                                    <p className="text-[14px] font-medium text-zinc-500 dark:text-zinc-400 max-w-[240px] mx-auto">Follow other accounts to receive signals here.</p>
                                </div>
                            )}
                            {posts.map((post,i)=><PostCard key={post._id} post={post} index={i}/>)}
                            {!loading&&posts.length>0&&(
                                <div className="py-8 flex items-center gap-4 opacity-80">
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-300 dark:via-zinc-700 to-transparent"/>
                                    <div className="flex items-center gap-2.5 px-5 py-2.5 bg-white/40 dark:bg-[#18181b]/60 backdrop-blur-xl rounded-[20px] ring-1 ring-white/50 dark:ring-white/10 shadow-sm">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"/>
                                        <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-zinc-500 dark:text-zinc-400">End of Feed</span>
                                        <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" style={{animationDelay:"300ms"}}/>
                                    </div>
                                    <div className="h-px flex-1 bg-gradient-to-l from-transparent via-zinc-300 dark:via-zinc-700 to-transparent"/>
                                </div>
                            )}
                        </div>
                        <div className="w-64 shrink-0 hidden xl:block"><SuggestionsPanel/></div>
                    </div>
                </div>
            </div>
        </>
    );
}