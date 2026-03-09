"use client"

import { useEffect, useState } from "react"
import { MapPin, Globe, Lock, ShieldCheck, Share2, Users, Layers, ArrowUpRight, UserPlus, Check } from "lucide-react"

/* ─── TYPES — mapped from actual API response shape ─── */
interface PublicProfile {
    _id: string
    username: string       // from data.user.username
    name?: string          // may not exist if user hasn't set it
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
    console.log(`Fetching public profile for ${username} from ${base}profile/${username}`)
    const res = await fetch(`${base}profile/${username}`)
    if (!res.ok) throw new Error("Profile not found")
    const json = await res.json()
    const d = json.data
    console.log("Fetched public profile data:", d)
    return {
        ...d,
        // username is nested under d.user.username in the response
        username: d.user?.username ?? username,
        // name may not exist — fall back to username
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

/* ─── STATS ─── */
const PublicStats = ({ profile }: { profile: PublicProfile }) => {
    const stats = [
        { label: "Total_Posts", value: profile.postsCount,    sub: "System_Logs",        inverted: false, arrow: true  },
        { label: "Followers",   value: profile.followersCount, sub: "Verified_Nodes",     inverted: true,  arrow: false },
        { label: "Following",   value: profile.followingCount, sub: "Active_Connections", inverted: false, arrow: false },
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[2px] mt-[2px]">
            {stats.map((s, i) => (
                <div key={s.label}
                    className={`relative overflow-hidden p-7 transition-all duration-300
                        ${s.inverted
                            ? "bg-black dark:bg-white text-white dark:text-black"
                            : "bg-white dark:bg-[#0F0F0F] text-black dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800"
                        }`}
                >
                    {!s.inverted && <DotGrid />}
                    <div className="relative z-10 flex flex-col gap-8">
                        <div className="flex items-center justify-between">
                            <span className={`text-[9px] font-bold uppercase tracking-[0.35em] ${s.inverted ? "opacity-50" : "text-zinc-400"}`}>
                                {s.label}
                            </span>
                            {i === 0 && <Layers size={13} className="text-zinc-300 dark:text-zinc-700" />}
                            {i === 1 && <Users size={13} className="opacity-50" />}
                            {i === 2 && <div className="w-1.5 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700" />}
                        </div>
                        <div>
                            <p className="text-[52px] font-black leading-none tracking-[-0.05em]">
                                {s.value.toLocaleString()}
                            </p>
                            <p className={`text-[8px] font-bold uppercase tracking-[0.25em] mt-3 flex items-center gap-1.5 ${s.inverted ? "opacity-50" : "text-zinc-400"}`}>
                                {s.sub} {s.arrow && <ArrowUpRight size={9} />}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

/* ─── MAIN ─── */
export default function PublicProfileView({ username }: { username: string }) {

    console.log("==== COMPONENT RENDERED ====")
    console.log("Username prop received:", username)
    const [profile, setProfile] = useState<PublicProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (!username) return
        setLoading(true)
        setError(false)
        fetchPublicProfile(username)
            .then(data => setProfile(data))
            .catch(() => setError(true))
            .finally(() => setLoading(false))
    }, [username])

    const handleShare = () => {
        navigator.clipboard?.writeText(window.location.href)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (loading) return <Skeleton />
    if (error || !profile) return <NotFound username={username} />

    const joinedYear = new Date(profile.createdAt).getFullYear()
    const displayName = profile.name || profile.username

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

                        {/* Follow button */}
                        <button className="w-40 md:w-48 h-11 border-2 border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-bold uppercase text-[9px] tracking-[0.25em] flex items-center justify-center gap-2.5 hover:invert transition-all active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
                            <UserPlus size={12} /> Follow
                        </button>
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
                                    <a href={profile.website} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-400 hover:text-black dark:hover:text-white transition-colors group">
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
            <PublicStats profile={profile} />
        </div>
    )
}