"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { MapPin, Globe, Lock, Edit3, Share2, ShieldCheck, RefreshCw } from "lucide-react"
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
    const [profile, setProfile]     = useState<ProfileUser | null>(null)
    const [refreshing, setRefreshing] = useState(false)
    const mounted = useRef(true)

    const fetch = useCallback(async (silent = false) => {
        if (!silent) setRefreshing(true)
        try {
            const res  = await api.get("/profile/me")
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

    if (!profile) return <ProfileHeaderSkeleton />

    return (
        <div className="relative overflow-hidden bg-white dark:bg-[#0F0F0F] border border-zinc-200 dark:border-zinc-800 font-mono">
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
                                    alt={profile.name}
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
                    <Link href="/profile/editprofile" className="block">
                        <button className="w-40 md:w-48 h-11 border-2 border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-bold uppercase text-[9px] tracking-[0.25em] flex items-center justify-center gap-2.5 hover:invert transition-all active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
                            <Edit3 size={12} /> Edit_Profile
                        </button>
                    </Link>
                </div>

                {/* Info column */}
                <div className="flex-1 flex flex-col w-full">
                    <div className="mb-6 space-y-2">
                        <h1 className="text-[40px] md:text-[50px] font-black tracking-[-0.04em] uppercase leading-[0.88] text-black dark:text-white">
                            @{profile.user.username}
                        </h1>
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-[15px] font-bold uppercase tracking-[0.45em] text-zinc-400">
                                {profile.name}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                            <span className={`text-[9px] font-bold uppercase tracking-[0.3em] ${profile.isPrivate ? "text-zinc-400" : "text-[#E8001A]"}`}>
                                {profile.isPrivate ? "Private" : "Public"}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                            <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-400">
                                User Since {new Date(profile.createdAt).getFullYear()}
                            </span>
                            {refreshing && <RefreshCw size={9} className="text-zinc-400 animate-spin" />}
                        </div>
                    </div>

                    <div className="flex-1 mb-8">
                        <p className="text-[14px] font-medium text-zinc-500 dark:text-zinc-400 max-w-xl leading-relaxed border-l-2 border-zinc-200 dark:border-zinc-800 pl-5">
                            {profile.bio || "Synchronizing biometric data..."}
                        </p>
                    </div>

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
                        <div className="flex items-center gap-3">
                            <button onClick={refetch}
                                className="flex items-center px-3 py-2 border border-zinc-200 dark:border-zinc-800 hover:border-black dark:hover:border-white transition-all group active:scale-90">
                                <RefreshCw size={13} className={`text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors ${refreshing ? "animate-spin" : ""}`} />
                            </button>
                            <button className="flex items-center gap-2.5 px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:border-black dark:hover:border-white transition-all group active:scale-90">
                                <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-400 group-hover:text-black dark:group-hover:text-white">Share</span>
                                <Share2 size={13} className="text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}