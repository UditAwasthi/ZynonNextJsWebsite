"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { MapPin, Globe, Lock, Edit3, Check, Share2, ShieldCheck, RefreshCw, Calendar, Pencil } from "lucide-react"
import Link from "next/link"
import api from "../../lib/api/api"
import { cache, TTL } from "../../lib/cache"

/* ─── TYPES ─── */
export interface ProfileUser {
    _id: string
    name: string
    username: string
    bio?: string
    location?: string
    website?: string
    profilePicture?: string
    isPrivate?: boolean
    isVerified?: boolean
    followersCount: number
    followingCount: number
    postsCount: number
    createdAt: string
    user: {
        _id: string
        username: string
        email?: string
    }
}

const CACHE_KEY = "profile:me"

/* ─── HOOK ─── */
export function useProfile() {
    const [profile, setProfile] = useState<ProfileUser | null>(null)
    const [refreshing, setRefreshing] = useState(false)
    const mounted = useRef(true)

    const fetch = useCallback(async (silent = false) => {
        if (!silent) setRefreshing(true)
        try {
            const res = await api.get("/profile/me")
            const data: ProfileUser = res.data.data
            if (!mounted.current) return
            setProfile(data)
            cache.set(CACHE_KEY, data, TTL.PROFILE)
        } catch { }
        finally { if (mounted.current) setRefreshing(false) }
    }, [])

    useEffect(() => {
        mounted.current = true

        // Show stale data instantly — renders the page with no skeleton
        const stale = cache.getStale<ProfileUser>(CACHE_KEY)
        if (stale) {
            setProfile(stale)
            fetch(true)   // silent background refresh
        } else {
            fetch(false)  // first load — show spinner
        }

        return () => { mounted.current = false }
    }, [fetch])

    return { profile, refreshing, refetch: () => fetch(false) }
}

/* Exported so ProfileStatGrid can update the cached counts without refetching */
export function patchProfileCache(patch: Partial<ProfileUser>) {
    cache.patch<ProfileUser>(CACHE_KEY, patch)
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
export const ProfileHeaderSkeleton = () => (
    <div className="animate-pulse h-[280px] bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800" />
)

/* ─── PROFILE HEADER ─── */
export function ProfileHeader() {
    const { profile, refreshing, refetch } = useProfile()
    const [copied, setCopied] = useState(false)

    if (!profile) return <ProfileHeaderSkeleton />
    const handleShare = () => {
        const url = `${window.location.origin}/profile/${profile?.user?.username}`
        navigator.clipboard?.writeText(url)

        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }
    return (
        <div className="relative w-full max-w-7xl mx-auto overflow-hidden bg-white dark:bg-[#0D0D0D] border border-zinc-200/80 dark:border-white/[0.06] rounded-[28px] font-mono shadow-lg dark:shadow-2xl transition-colors duration-300">

            {/* Dot Matrix — reuses the same nothing-dot-grid class from Sidebar */}
            <div className="absolute inset-0 nothing-dot-grid opacity-[0.03] dark:opacity-[0.07] pointer-events-none" />

            {/* Status Bar */}
            <div className="relative flex items-center justify-between px-8 py-3 border-b border-zinc-100 dark:border-white/[0.05] bg-zinc-50/60 dark:bg-transparent">
                <div className="flex items-center gap-3">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF0000] opacity-60" style={{ animationDuration: "2s" }} />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF0000]" />
                    </span>
                    {/* font-mono tracking label — matches sidebar nav label style */}
                    <span className="text-[8px] font-bold tracking-[0.3em] uppercase text-zinc-400 dark:text-zinc-500">
                        Node · Active
                    </span>
                </div>
                <div className="text-[8px] font-bold tracking-[0.3em] text-zinc-400 dark:text-zinc-500 uppercase">
                    Ver 3.0
                </div>
            </div>

            <div className="relative z-10 p-6 md:p-14">
                <div className="flex flex-col md:flex-row items-start gap-6 md:gap-10">

                    {/* Profile Picture Column */}
                    <div className="flex flex-col items-center shrink-0 mx-auto md:mx-0">
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
                                    alt={profile.name}
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
                    </div>

                    {/* Content Column */}
                    <div className="flex-1 space-y-7 w-full">

                        {/* Identity Row */}
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 md:gap-6">
                            <div className="space-y-2.5 text-center md:text-left">
                                {/* Metadata row — font-mono tracking, matches sidebar nav label style */}
                                <div className="flex items-center justify-center md:justify-start gap-3">
                                    <span className="text-[8px] font-bold tracking-[0.3em] uppercase text-zinc-400 dark:text-zinc-500">
                                        {profile.isPrivate ? "Private" : "Public"}
                                    </span>
                                    <div className="h-px w-6 bg-zinc-200 dark:bg-zinc-800" />
                                    <span className="text-[8px] font-bold tracking-[0.3em] uppercase text-[#FF0000]">
                                        {profile.name}
                                    </span>
                                </div>
                                {/* Username — font-nothing, matches "Zynon" logo treatment in Sidebar */}
                                <h1 className="font-nothing text-4xl md:text-6xl tracking-[0.01em] text-black dark:text-white uppercase leading-[0.9]">
                                    {profile.user.username}
                                </h1>
                            </div>

                            <Link href="/profile/editprofile" className="shrink-0 flex justify-center md:justify-start">
                                <button className="group flex items-center gap-3 px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-white/[0.03] hover:bg-black dark:hover:bg-white hover:border-black dark:hover:border-white transition-all duration-300">
                                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-500 dark:text-zinc-400 group-hover:text-white dark:group-hover:text-black transition-colors">
                                        Edit Profile
                                    </span>
                                    <Pencil size={12} className="text-zinc-400 dark:text-zinc-600 group-hover:text-white dark:group-hover:text-black transition-colors" />
                                </button>
                            </Link>
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
                        <div className="max-w-2xl space-y-2 text-center md:text-left">
                            {/* Section label — matches "Session Control" in LogoutModal */}
                            <span className="text-[8px] font-bold tracking-[0.3em] uppercase text-zinc-400 dark:text-zinc-500 block">
                                Status Report
                            </span>
                            {/* Bio text — font-nothing for character, like the modal h2 */}
                            <p className="font-nothing text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                {profile.bio || "No status report available for this unit."}
                            </p>
                        </div>

                        {/* Meta Footer */}
                        <div className="flex flex-col md:flex-row md:flex-wrap items-center md:justify-between gap-4 md:gap-6 pt-6 border-t border-zinc-100 dark:border-zinc-900">
                            <div className="flex flex-wrap justify-center md:justify-start gap-3">
                                {profile.location && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:border-black dark:hover:border-white transition-colors">
                                        <MapPin size={11} className="text-[#FF0000]" />
                                        {/* font-mono label — matches sidebar nav item labels */}
                                        <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-zinc-900 dark:text-zinc-100">
                                            {profile.location}
                                        </span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:border-black dark:hover:border-white transition-colors">
                                    <Calendar size={11} className="text-zinc-400 dark:text-zinc-600" />
                                    <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-zinc-900 dark:text-zinc-100">
                                        Est. {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Refresh — matches the square icon buttons in LogoutModal */}
                                <button
                                    onClick={refetch}
                                    className="w-9 h-9 flex items-center justify-center border border-zinc-200 dark:border-zinc-800 hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black text-zinc-500 dark:text-zinc-400 transition-all"
                                >
                                    <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                                </button>
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
                        </div>
                    </div>
                </div>
            </div>

            {/* Corner accent lines — same red/neutral split as Sidebar toggle button */}
            <div className="absolute top-[46px] left-0 w-px h-8 bg-gradient-to-b from-[#FF0000]/40 to-transparent" />
            <div className="absolute top-[46px] right-0 w-px h-8 bg-gradient-to-b from-zinc-300/60 dark:from-white/10 to-transparent" />
        </div>
    )
}