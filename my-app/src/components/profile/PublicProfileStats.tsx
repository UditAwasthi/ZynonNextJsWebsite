"use client"

import Link from "next/link"
import { Grid, Users, ArrowUpRight } from "lucide-react"
import type { MutualFollower } from "./PublicProfileView"

interface PublicProfileStatsProps {
    postsCount: number
    followersCount: number
    followingCount: number
    mutualFollowersCount: number
    mutualFollowers: MutualFollower[]
    onFollowersClick: () => void
    onFollowingClick: () => void
}

/* ─── SKELETON ─── */
export const PublicProfileStatsSkeleton = () => (
    <div className="animate-pulse space-y-3 mt-6 w-full max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
                <div key={i} className="h-[120px] bg-zinc-100 dark:bg-zinc-900 rounded-[32px] border border-zinc-200 dark:border-zinc-800" />
            ))}
        </div>
        <div className="h-[52px] bg-zinc-100 dark:bg-zinc-900 rounded-[20px] border border-zinc-200 dark:border-zinc-800" />
    </div>
)

export function PublicProfileStats({
    postsCount,
    followersCount,
    followingCount,
    mutualFollowersCount,
    mutualFollowers,
    onFollowersClick,
    onFollowingClick,
}: PublicProfileStatsProps) {

    const stats = [
        {
            label: "Total_Posts",
            value: postsCount ?? 0,
            sub: "Repository_Entries",
            icon: <Grid size={13} />,
            onClick: undefined,
        },
        {
            label: "Followers",
            value: followersCount ?? 0,
            sub: "Verified_Nodes",
            icon: <Users size={13} />,
            onClick: onFollowersClick,
        },
        {
            label: "Following",
            value: followingCount ?? 0,
            sub: "Network_Links",
            icon: <Users size={13} />,
            onClick: onFollowingClick,
        }
    ]

    // Only render the mutual row when the backend returned data
    // (i.e. viewer is authenticated — unauthenticated responses return 0 / [])
    const showMutuals = mutualFollowersCount > 0

    return (
        <div className="mt-4 md:mt-6 w-full max-w-7xl mx-auto font-mono space-y-3">

            {/* ── Three stat cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats.map((s) => {
                    const isClickable = !!s.onClick;
                    const Tag = isClickable ? "button" : "div";

                    return (
                        <Tag
                            key={s.label}
                            onClick={s.onClick}
                            className={`relative overflow-hidden py-5 px-6 md:py-6 md:px-8 rounded-[32px] transition-all duration-500 text-left border
                                bg-white/70 dark:bg-[#0A0A0A]/90 backdrop-blur-3xl 
                                border-zinc-200 dark:border-zinc-800 text-black dark:text-white
                                ${isClickable ? "cursor-pointer hover:border-black dark:hover:border-white active:scale-[0.98]" : ""}
                            `}
                        >
                            {/* Unified Dot Matrix — Subtle technical texture */}
                            <div
                                className="absolute inset-0 pointer-events-none opacity-[0.05]"
                                style={{
                                    backgroundImage: "radial-gradient(circle, currentColor 0.8px, transparent 0.8px)",
                                    backgroundSize: "16px 16px",
                                }}
                            />

                            {/* Corner Accent — The signature Nothing red hint */}
                            <div className="absolute top-0 left-0 w-px h-8 bg-gradient-to-b from-[#FF0000]/40 to-transparent" />

                            <div className="relative z-10 flex flex-col gap-1">
                                {/* Label: Minimalist Prefix */}
                                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
                                    {s.label}:
                                    <span className="opacity-30">{s.icon}</span>
                                </span>

                                {/* Value Section */}
                                <div className="flex items-baseline gap-2">
                                    <p className="text-3xl md:text-4xl font-black leading-none tracking-tighter">
                                        {s.value.toLocaleString()}
                                    </p>
                                    {isClickable && (
                                        <span className="text-[10px] text-[#FF0000] font-black uppercase tracking-tighter opacity-70">
                                            Active
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Bottom-right indicator for clickable modules */}
                            {isClickable && (
                                <div className="absolute bottom-4 right-6 opacity-20">
                                    <ArrowUpRight size={14} />
                                </div>
                            )}
                        </Tag>
                    );
                })}
            </div>

            {/* ── Mutual followers bar ── only shown when viewer is logged in ── */}
            {showMutuals && (
                <div className="relative overflow-hidden flex items-center gap-4 px-6 py-3.5 rounded-[20px] border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-[#0A0A0A]/90 backdrop-blur-3xl">

                    {/* Red left accent */}
                    <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-[#FF0000]/50 via-[#FF0000]/10 to-transparent" />

                    {/* Label */}
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-500 shrink-0">
                        Followed_by:
                    </span>

                    {/* Avatar stack — backend sends max 3, all linkable */}
                    <div className="flex items-center -space-x-2">
                        {mutualFollowers.slice(0, 3).map((m) => (
                            <Link
                                key={m.username}
                                href={`/profile/${m.username}`}
                                title={`@${m.username}`}
                                className="w-7 h-7 rounded-full overflow-hidden border-2 border-white dark:border-[#0A0A0A] bg-zinc-200 dark:bg-zinc-800 shrink-0 hover:scale-110 transition-transform duration-200"
                            >
                                <img
                                    src={m.profilePicture || "/default-avatar.png"}
                                    alt={m.username}
                                    className="w-full h-full object-cover"
                                />
                            </Link>
                        ))}
                    </div>

                    {/* Names — link each one */}
                    <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 truncate">
                        {mutualFollowers.slice(0, 2).map((m, i, arr) => (
                            <span key={m.username}>
                                <Link
                                    href={`/profile/${m.username}`}
                                    className="hover:text-black dark:hover:text-white transition-colors"
                                >
                                    @{m.username}
                                </Link>
                                {i < arr.length - 1 && <span className="text-zinc-400">, </span>}
                            </span>
                        ))}
                        {mutualFollowersCount > 2 && (
                            <span className="text-zinc-400 dark:text-zinc-600">
                                {" "}and {mutualFollowersCount - 2} other{mutualFollowersCount - 2 !== 1 ? "s" : ""} you follow
                            </span>
                        )}
                        {mutualFollowersCount <= 2 && mutualFollowersCount > 0 && (
                            <span className="text-zinc-400 dark:text-zinc-600"> also follow{mutualFollowersCount === 1 ? "s" : ""} them</span>
                        )}
                    </span>

                    {/* Count badge */}
                    <span className="ml-auto shrink-0 text-[9px] font-black uppercase tracking-[0.2em] text-[#FF0000] opacity-80">
                        {mutualFollowersCount.toLocaleString()}
                    </span>
                </div>
            )}

        </div>
    )
}