"use client"

import { useEffect, useState } from "react"
import { MapPin, Globe, Lock, ShieldCheck, Share2, Check, Grid } from "lucide-react"
import FollowButton from "./FollowButton"
import { PublicProfileStats } from "./PublicProfileStats"
import { swr, cache } from "../../lib/cache"
import FollowListModal from "./FollowListModal"
import PublicPostsGrid from "./PublicPostsGrid"

/* ─── TYPES ─── */
interface ProfileUser {
    _id: string
    username: string
}

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

/* ─── FETCH — no auth token ─── */
async function fetchPublicProfile(username: string): Promise<PublicProfile> {
    const base = process.env.NEXT_PUBLIC_API_BASE || "https://zynon.onrender.com/api/"
    const res = await fetch(`${base}profile/${username}`)
    if (!res.ok) throw new Error("Profile not found")
    const json = await res.json()
    const d = json.data
    return {
        ...d,
        username: d.user?.username ?? username,
        name: d.name ?? undefined,
    }
}

/* ─── DOT GRID ─── */
const DotGrid = () => (
    <div
        className="absolute inset-0 pointer-events-none"
        style={{
            backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "18px 18px",
            opacity: 0.04,
        }}
    />
)

/* ─── SKELETON ─── */
const Skeleton = () => (
    <div className="animate-pulse space-y-[2px] font-mono">
        <div className="h-[280px] bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800" />
        <div className="grid grid-cols-3 gap-[2px]">
            {[1, 2, 3].map(i => (
                <div key={i} className="h-[130px] bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800" />
            ))}
        </div>
    </div>
)

/* ─── NOT FOUND ─── */
const NotFound = ({ username }: { username: string }) => (
    <div className="font-mono border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0F0F0F] p-16 text-center space-y-4">
        <p className="text-[9px] font-bold uppercase tracking-[0.5em] text-[#E8001A]">Node_Not_Found</p>
        <p className="text-[40px] font-black tracking-[-0.04em] uppercase text-black dark:text-white leading-none">
            @{username}
        </p>
        <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-400">
            This transmission does not exist
        </p>
    </div>
)

/* ─── FOLLOW STATE — tracks whether viewer is following this profile ─── */
type FollowState = "following" | "requested" | "not_following"

/* ─── MAIN ─── */
export default function PublicProfileView({ username }: { username: string }) {
    const [profile, setProfile] = useState<PublicProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [copied, setCopied] = useState(false)
    const [followersCount, setFollowersCount] = useState(0)
    const [modal, setModal] = useState<"followers" | "following" | null>(null)
    // Track follow state so we can decide whether to show the grid on private profiles
    const [viewerFollowState, setViewerFollowState] = useState<FollowState>("not_following")

    useEffect(() => {
        if (!username) return
        setLoading(true)
        setError(false)

        swr(
            `profile:${username}`,
            () => fetchPublicProfile(username),
            (data, fromCache) => {
                setProfile(data)
                setFollowersCount(data.followersCount)
                if (fromCache) setLoading(false)
            },
            () => setError(true),
        ).finally(() => setLoading(false))
    }, [username])

    // Listen for follow state changes from FollowButton via the onFollowChange callback
    const handleFollowChange = (delta: number) => {
        setFollowersCount(prev => Math.max(0, prev + delta))
        cache.invalidate(`profile:${username}`)
        // +1 means just followed (public profile), -1 means unfollowed
        if (delta === +1) setViewerFollowState("following")
        if (delta === 0) setViewerFollowState("requested")   // private profile — request sent
        if (delta === -1) setViewerFollowState("not_following")
    }

    // Extended callback that carries the new state directly from FollowButton
    // We also sync viewerFollowState by inspecting delta signs
    const handleFollowStateChange = (delta: number, newState?: FollowState) => {
        handleFollowChange(delta)
        if (newState) setViewerFollowState(newState)
    }

    const handleShare = () => {
        navigator.clipboard?.writeText(window.location.href)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (loading) return <Skeleton />
    if (error || !profile) return <NotFound username={username} />

    const joinedYear = new Date(profile.createdAt).getFullYear()
    const displayName = profile.name || profile.username

    // Decide whether to show the private wall:
    // Private profile AND viewer has not been accepted (not "following")
    const showPrivateWall = profile.isPrivate && viewerFollowState !== "following"

    return (
        <div className="font-mono">
            {/* ── HEADER ── */}
            <div className="relative overflow-hidden bg-white dark:bg-[#0F0F0F] border border-zinc-200 dark:border-zinc-800">
                <DotGrid />
                <div className="h-[2px] w-full bg-black dark:bg-white" />

                <div className="relative z-10 flex flex-col md:flex-row gap-10 md:gap-14 items-start p-8 md:p-12">

                    {/* Avatar column */}
                    <div className="flex flex-col gap-4 shrink-0 mx-auto md:mx-0">
                        <div className="relative">
                            <div className="w-40 h-40 md:w-48 md:h-48 border-2 border-black dark:border-white p-1 bg-white dark:bg-black shadow-[8px_8px_0px_0px_rgba(0,0,0,0.08)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.04)]">
                                <div className="w-full h-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                                    <img
                                        src={profile.profilePicture || "/default-avatar.png"}
                                        alt={displayName}
                                        className="w-full h-full object-cover grayscale hover:grayscale-0 hover:scale-110 transition-all duration-700"
                                    />
                                </div>
                            </div>
                            {profile.isPrivate && (
                                <div className="absolute -top-2.5 -right-2.5 bg-black dark:bg-white p-[7px] shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)]">
                                    <Lock size={11} className="text-white dark:text-black" />
                                </div>
                            )}
                            {profile.isVerified && (
                                <div className="absolute -bottom-2.5 -right-2.5 bg-[#E8001A] p-[7px]">
                                    <ShieldCheck size={11} className="text-white" />
                                </div>
                            )}
                        </div>

                        <FollowButton
                            userId={profile.user._id}
                            onFollowChange={handleFollowChange}
                        />
                    </div>

                    {/* Info column */}
                    <div className="flex-1 flex flex-col w-full">
                        <div className="mb-6 space-y-2">
                            <h1 className="text-[40px] md:text-[60px] font-black tracking-[-0.04em] uppercase leading-[0.88] text-black dark:text-white">
                                {displayName}
                            </h1>
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-[9px] font-bold uppercase tracking-[0.45em] text-zinc-400">
                                    @{profile.username}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                <span className={`text-[9px] font-bold uppercase tracking-[0.3em] ${profile.isPrivate ? "text-zinc-400" : "text-[#E8001A]"}`}>
                                    {profile.isPrivate ? "P-L0CKED" : "P-OPEN"}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-400">
                                    Since_{joinedYear}
                                </span>
                                {profile.category && (
                                    <>
                                        <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                        <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-400">
                                            [{profile.category}]
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 mb-8">
                            <p className="text-[14px] font-medium text-zinc-500 dark:text-zinc-400 max-w-xl leading-relaxed border-l-2 border-zinc-200 dark:border-zinc-800 pl-5">
                                {profile.bio || "No bio available."}
                            </p>
                        </div>

                        {/* Utility row */}
                        <div className="flex flex-wrap items-center justify-between gap-y-5 pt-6 border-t border-zinc-100 dark:border-zinc-800/60">
                            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                                {profile.location && (
                                    <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-400">
                                        <MapPin size={13} className="text-zinc-300 dark:text-zinc-600" />
                                        {profile.location}
                                    </div>
                                )}
                                {profile.website && (
                                    <a
                                        href={profile.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-400 hover:text-black dark:hover:text-white transition-colors group"
                                    >
                                        <Globe size={13} className="text-zinc-300 dark:text-zinc-600 group-hover:rotate-12 transition-transform" />
                                        <span className="underline underline-offset-4 decoration-zinc-200 dark:decoration-zinc-800">
                                            {profile.website.replace(/^https?:\/\//, "")}
                                        </span>
                                    </a>
                                )}
                            </div>

                            <button
                                onClick={handleShare}
                                className="flex items-center gap-2.5 px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:border-black dark:hover:border-white transition-all group active:scale-90"
                            >
                                {copied
                                    ? <><Check size={13} className="text-emerald-500" /><span className="text-[9px] font-bold uppercase tracking-[0.3em] text-emerald-500">Copied</span></>
                                    : <><span className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-400 group-hover:text-black dark:group-hover:text-white">Share</span><Share2 size={13} className="text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors" /></>
                                }
                            </button>
                        </div>
                    </div>
                </div>
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

            {/* ── POSTS SECTION ── */}
            <PublicProfileTabs
                userId={profile.user._id}
                isPrivate={showPrivateWall}
                username={profile.username}
            />
        </div>
    )
}

/* ─── TABS ─── */
function PublicProfileTabs({
    userId,
    isPrivate,
    username,
}: {
    userId: string
    isPrivate: boolean
    username: string
}) {
    // For public profiles we only show "Artifacts" (posts).
    // Tab bar is kept for visual consistency and future extensibility.
    return (
        <div className="mt-16 space-y-10 pb-24">
            {/* Tab control */}
            <div className="flex justify-center">
                <div className="flex p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <div
                        className="px-8 py-2 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 bg-black dark:bg-white text-white dark:text-black"
                    >
                        <Grid size={14} strokeWidth={2.5} />
                        Artifacts
                    </div>
                </div>
            </div>

            {/* Grid */}
            <PublicPostsGrid
                userId={userId}
                isPrivate={isPrivate}
                username={username}
            />
        </div>
    )
}