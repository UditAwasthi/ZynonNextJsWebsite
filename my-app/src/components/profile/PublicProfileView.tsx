"use client"

import { useEffect, useState } from "react"
import { MapPin, Globe, Lock, ShieldCheck, Share2, Check, Grid, Calendar } from "lucide-react"
import FollowButton from "./FollowButton"
import { PublicProfileStats } from "./PublicProfileStats"
import { swr, cache } from "../../lib/cache"
import FollowListModal from "./FollowListModal"
import PublicPostsGrid from "./PublicPostsGrid"
import MessageButton from "../messaging/MessageButton"
import { getFollowStatus } from "../../lib/api/followApi"

interface ProfileUser { _id: string; username: string }

interface PublicProfile {
    _id: string
    user: ProfileUser
    username: string
    name?: string
    bio?: string
    location?: string
    website?: string
    profilePicture?: string
    coverPhoto?: string
    isPrivate: boolean
    isVerified: boolean
    followersCount: number
    followingCount: number
    postsCount: number
    createdAt: string
    category?: string
    profileVisibility?: string
}

async function fetchPublicProfile(username: string): Promise<PublicProfile> {
    const base = process.env.NEXT_PUBLIC_API_BASE || "https://zynon.onrender.com/api/"
    const res = await fetch(`${base}profile/${username}`)
    if (!res.ok) throw new Error("Profile not found")
    const json = await res.json()
    const d = json.data
    // Normalize: ensure user._id is always populated (fallback to profile doc _id)
    const userId = d.user?._id ?? d._id
    return {
        ...d,
        user: { ...d.user, _id: userId },
        username: d.user?.username ?? username,
        name: d.name ?? undefined,
    }
}

/* ── Skeleton ── */
const Skeleton = () => (
    <div className="animate-pulse space-y-[2px] font-mono">
        <div className="h-[280px] bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[28px]" />
        <div className="grid grid-cols-3 gap-[2px]">
            {[1, 2, 3].map(i => (
                <div key={i} className="h-[130px] bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800" />
            ))}
        </div>
    </div>
)

/* ── Not Found ── */
const NotFound = ({ username }: { username: string }) => (
    <div className="relative overflow-hidden font-mono border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0D0D0D] p-16 text-center space-y-4 rounded-[28px]">
        <div className="absolute inset-0 pointer-events-none dark:hidden"
            style={{ backgroundImage: "radial-gradient(circle, rgba(0,0,0,1) 1px, transparent 1px)", backgroundSize: "12px 12px", opacity: 0.04 }} />
        <div className="absolute inset-0 pointer-events-none hidden dark:block"
            style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,1) 1px, transparent 1px)", backgroundSize: "12px 12px", opacity: 0.055 }} />
        <div className="relative z-10 space-y-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.5em] text-[#FF0000]">Node_Not_Found</p>
            <p className="text-[40px] font-black tracking-[-0.04em] uppercase text-black dark:text-white leading-none">@{username}</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-500">
                This transmission does not exist
            </p>
        </div>
    </div>
)

type FollowState = "following" | "requested" | "not_following"

export default function PublicProfileView({ username }: { username: string }) {
    const [profile,           setProfile]           = useState<PublicProfile | null>(null)
    const [loading,           setLoading]           = useState(true)
    const [error,             setError]             = useState(false)
    const [copied,            setCopied]            = useState(false)
    const [followersCount,    setFollowersCount]    = useState(0)
    const [modal,             setModal]             = useState<"followers" | "following" | null>(null)
    const [viewerFollowState, setViewerFollowState] = useState<FollowState>("not_following")

    useEffect(() => {
        if (!username) return
        setLoading(true); setError(false)
        swr(
            `profile:${username}`,
            () => fetchPublicProfile(username),
            (data, fromCache) => {
                setProfile(data); setFollowersCount(data.followersCount)
                if (fromCache) setLoading(false)
            },
            () => setError(true),
        ).finally(() => setLoading(false))
    }, [username])

    // Fetch the real follow status from the API — viewerFollowState defaults to
    // "not_following" which would wrongly show the private wall if already following
    useEffect(() => {
        if (!profile?.user._id) return
        getFollowStatus(profile.user._id)
            .then(res => {
                const status = res.data?.data?.status as FollowState | undefined
                if (status) setViewerFollowState(status)
            })
            .catch(() => { /* not logged in or failed — leave as not_following */ })
    }, [profile?.user._id])

    const handleFollowChange = (delta: number) => {
        setFollowersCount(prev => Math.max(0, prev + delta))
        cache.invalidate(`profile:${username}`)
        if (delta === +1) setViewerFollowState("following")
        if (delta === 0)  setViewerFollowState("requested")
        if (delta === -1) setViewerFollowState("not_following")
    }

    const handleFollowStateChange = (delta: number, newState?: FollowState) => {
        handleFollowChange(delta)
        if (newState) setViewerFollowState(newState)
    }

    const handleShare = () => {
        navigator.clipboard?.writeText(window.location.href)
        setCopied(true); setTimeout(() => setCopied(false), 2000)
    }

    if (loading) return <Skeleton />
    if (error || !profile) return <NotFound username={username} />

    const joinedDate      = new Date(profile.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    const displayName     = profile.name || profile.username
    const showPrivateWall = profile.isPrivate && viewerFollowState !== "following"

    return (
        <div className="font-mono">

            {/* ══════════════════════════════════════════════
                HEADER — mirrors ProfileHeader.tsx exactly
            ══════════════════════════════════════════════ */}
            <div className="relative w-full overflow-hidden bg-white dark:bg-[#0D0D0D] border border-zinc-200/80 dark:border-white/[0.06] rounded-[28px] shadow-lg dark:shadow-2xl transition-colors duration-300">

                {/* Dot Matrix — light */}
                <div className="absolute inset-0 pointer-events-none dark:hidden"
                    style={{ backgroundImage: "radial-gradient(circle, rgba(0,0,0,1) 1px, transparent 1px)", backgroundSize: "12px 12px", opacity: 0.04 }} />
                {/* Dot Matrix — dark */}
                <div className="absolute inset-0 pointer-events-none hidden dark:block"
                    style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,1) 1px, transparent 1px)", backgroundSize: "12px 12px", opacity: 0.055 }} />

                {/* Status Bar */}
                <div className="relative flex items-center justify-between px-8 py-3 border-b border-zinc-100 dark:border-white/[0.05] bg-zinc-50/60 dark:bg-transparent">
                    <div className="flex items-center gap-3">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF0000] opacity-60" style={{ animationDuration: "2s" }} />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF0000]" />
                        </span>
                        <span className="text-[8px] font-bold tracking-[0.3em] uppercase text-zinc-400 dark:text-zinc-500">
                            Node · Active
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        {profile.isPrivate && (
                            <span className="text-[8px] font-bold tracking-[0.3em] uppercase text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                                <Lock size={9} className="text-zinc-400 dark:text-zinc-600" />
                                Private
                            </span>
                        )}
                        <div className="text-[8px] font-bold tracking-[0.3em] text-zinc-400 dark:text-zinc-500 uppercase">
                            {profile.category ? `[${profile.category}]` : "Ver 3.0"}
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="relative z-10 p-10 md:p-14">
                    <div className="flex flex-col md:flex-row items-start gap-10">

                        {/* Avatar Column */}
                        <div className="flex flex-col items-center gap-4 shrink-0 mx-auto md:mx-0">
                            <div className="relative">
                                {/* Dot halo — light */}
                                <div className="absolute -inset-3 rounded-[28px] opacity-[0.12] dark:hidden pointer-events-none"
                                    style={{ backgroundImage: "radial-gradient(circle, black 1px, transparent 1px)", backgroundSize: "6px 6px" }} />
                                {/* Dot halo — dark */}
                                <div className="absolute -inset-3 rounded-[28px] opacity-20 hidden dark:block pointer-events-none"
                                    style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "6px 6px" }} />

                                <div className="relative w-[88px] h-[88px] md:w-[100px] md:h-[100px] rounded-[22px] overflow-hidden border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-[#111]">
                                    <img
                                        src={profile.profilePicture || "/default-avatar.png"}
                                        alt={displayName}
                                        className="w-full h-full object-cover grayscale brightness-95 dark:brightness-90 hover:grayscale-0 transition-all duration-700"
                                    />
                                    {/* Scanlines */}
                                    <div className="absolute inset-0 pointer-events-none"
                                        style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)" }} />
                                </div>

                                {profile.isVerified && (
                                    <div className="absolute -bottom-2 -right-2 bg-[#FF0000] w-6 h-6 rounded-full border-2 border-white dark:border-[#0D0D0D] flex items-center justify-center">
                                        <ShieldCheck size={11} className="text-white" />
                                    </div>
                                )}
                            </div>

                            {/* Follow + Message */}
                            <FollowButton userId={profile.user._id} onFollowChange={handleFollowChange} />
                            <MessageButton userId={profile.user._id} />
                        </div>

                        {/* Content Column */}
                        <div className="flex-1 space-y-7 w-full">

                            {/* Identity Row */}
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                <div className="space-y-2.5">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[8px] font-bold tracking-[0.3em] uppercase text-zinc-400 dark:text-zinc-500">
                                            {profile.isPrivate ? "Private" : "Public"}
                                        </span>
                                        <div className="h-px w-6 bg-zinc-200 dark:bg-zinc-800" />
                                        <span className="text-[8px] font-bold tracking-[0.3em] uppercase text-[#FF0000]">
                                            {displayName}
                                        </span>
                                    </div>
                                    <h2 className="font-nothing text-4xl md:text-6xl tracking-[0.2em] text-black dark:text-white uppercase leading-[0.9]">
                                        {profile.username}
                                    </h2>
                                </div>

                                {/* Share button */}
                                <button
                                    onClick={handleShare}
                                    className="shrink-0 group flex items-center gap-3 px-5 py-2.5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-white/[0.03] hover:bg-black dark:hover:bg-white hover:border-black dark:hover:border-white transition-all duration-300"
                                >
                                    {copied ? (
                                        <>
                                            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-emerald-500">Copied</span>
                                            <Check size={12} className="text-emerald-500" />
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-500 dark:text-zinc-400 group-hover:text-white dark:group-hover:text-black transition-colors">
                                                Share
                                            </span>
                                            <Share2 size={12} className="text-zinc-400 dark:text-zinc-600 group-hover:text-white dark:group-hover:text-black transition-colors" />
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Dot Divider */}
                            <div className="flex items-center gap-4">
                                <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-900" />
                                <div className="grid grid-cols-3 gap-[3px] opacity-20">
                                    {[...Array(9)].map((_, i) => (
                                        <div key={i} className="w-[3px] h-[3px] rounded-full bg-black dark:bg-white" />
                                    ))}
                                </div>
                                <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-900" />
                            </div>

                            {/* Bio */}
                            <div className="max-w-2xl space-y-2">
                                <span className="text-[8px] font-bold tracking-[0.3em] uppercase text-zinc-400 dark:text-zinc-500 block">
                                    Status Report
                                </span>
                                <p className="font-nothing text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                    {profile.bio || "No status report available for this unit."}
                                </p>
                            </div>

                            {/* Meta Footer */}
                            <div className="flex flex-wrap items-center justify-between gap-6 pt-6 border-t border-zinc-100 dark:border-zinc-900">
                                <div className="flex flex-wrap gap-3">
                                    {profile.location && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:border-black dark:hover:border-white transition-colors">
                                            <MapPin size={11} className="text-[#FF0000]" />
                                            <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-zinc-900 dark:text-zinc-100">
                                                {profile.location}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:border-black dark:hover:border-white transition-colors">
                                        <Calendar size={11} className="text-zinc-400 dark:text-zinc-600" />
                                        <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-zinc-900 dark:text-zinc-100">
                                            Est. {joinedDate}
                                        </span>
                                    </div>
                                    {profile.website && (
                                        <a
                                            href={profile.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:border-black dark:hover:border-white transition-colors group"
                                        >
                                            <Globe size={11} className="text-zinc-400 dark:text-zinc-600 group-hover:text-black dark:group-hover:text-white transition-colors" />
                                            <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-zinc-900 dark:text-zinc-100 group-hover:text-black dark:group-hover:text-white transition-colors">
                                                {profile.website.replace(/^https?:\/\//, "")}
                                            </span>
                                        </a>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Corner accent lines — exact match to ProfileHeader */}
                <div className="absolute top-[46px] left-0 w-px h-8 bg-gradient-to-b from-[#FF0000]/40 to-transparent" />
                <div className="absolute top-[46px] right-0 w-px h-8 bg-gradient-to-b from-zinc-300/60 dark:from-white/10 to-transparent" />
            </div>

            {/* ── STATS ── */}
            <PublicProfileStats
                postsCount={profile.postsCount}
                followersCount={followersCount}
                followingCount={profile.followingCount}
                onFollowersClick={() => setModal("followers")}
                onFollowingClick={() => setModal("following")}
            />

            {/* ── FOLLOW LIST MODAL ── */}
            {modal && (
                <FollowListModal
                    userId={profile.user._id}
                    mode={modal}
                    onClose={() => setModal(null)}
                />
            )}

            {/* ── POSTS SECTION ── only render when userId is confirmed */}
            {profile.user._id && (
                <PublicProfileTabs
                    userId={profile.user._id}
                    isPrivate={showPrivateWall}
                    username={profile.username}
                />
            )}
        </div>
    )
}

function PublicProfileTabs({ userId, isPrivate, username }: { userId: string; isPrivate: boolean; username: string }) {
    return (
        <div className="mt-[2px] space-y-10 pb-24">
            {/* Tab control */}
            <div className="flex justify-center pt-14">
                <div className="flex p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <div className="px-8 py-2 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 bg-black dark:bg-white text-white dark:text-black">
                        <Grid size={14} strokeWidth={2.5} />
                        Artifacts
                    </div>
                </div>
            </div>

            <PublicPostsGrid userId={userId} isPrivate={isPrivate} username={username} />
        </div>
    )
}