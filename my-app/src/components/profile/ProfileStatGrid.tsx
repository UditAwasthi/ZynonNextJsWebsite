"use client"

import { useState } from "react"
import { Layers, Users, ArrowUpRight } from "lucide-react"
import { useProfile, writeCache } from "./ProfileHeader"
import FollowListModal from "./FollowListModal"

/* ─── SKELETON ─── */
export const ProfileStatsSkeleton = () => (
    <div className="animate-pulse grid grid-cols-3 gap-[2px] mt-[2px]">
        {[1, 2, 3].map(i => (
            <div key={i} className="h-[140px] bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800" />
        ))}
    </div>
)

/* ─── DOT GRID ─── */
const DotGrid = () => (
    <div
        className="absolute inset-0 pointer-events-none"
        style={{
            backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "18px 18px",
            opacity: 0.05,
        }}
    />
)

/* ─── PROFILE STATS ─── */
export function ProfileStats() {
    const { profile, refetch } = useProfile()
    const [modal, setModal] = useState<"followers" | "following" | null>(null)
    // Local overrides for optimistic counter updates
    const [followersDelta, setFollowersDelta] = useState(0)
    const [followingDelta, setFollowingDelta] = useState(0)

    if (!profile) return <ProfileStatsSkeleton />

    const userId = (profile.user as any)?._id ?? null

    // Called by FollowListModal when a follow/unfollow happens inside it
    // mode tells us whether the modal was showing followers or following list
    const handleFollowChange = (delta: number, mode: "followers" | "following") => {
        if (mode === "followers") {
            setFollowersDelta(prev => prev + delta)
        } else {
            setFollowingDelta(prev => prev + delta)
        }

        // Update cache so counters survive re-renders without a refetch
        const updated = {
            ...profile,
            followersCount: profile.followersCount + followersDelta + (mode === "followers" ? delta : 0),
            followingCount: profile.followingCount + followingDelta + (mode === "following" ? delta : 0),
        }
        writeCache(updated)
    }

    const stats = [
        {
            label: "Total_Posts",
            value: profile.postsCount,
            sub: "System_Logs",
            icon: <Layers size={13} className="text-zinc-300 dark:text-zinc-700" />,
            inverted: false,
            arrow: true,
            onClick: undefined,
        },
        {
            label: "Followers",
            value: Math.max(0, profile.followersCount + followersDelta),
            sub: "Verified_Nodes",
            icon: <Users size={13} />,
            inverted: true,
            arrow: false,
            onClick: () => setModal("followers"),
        },
        {
            label: "Following",
            value: Math.max(0, profile.followingCount + followingDelta),
            sub: "Active_Connections",
            icon: <div className="w-1.5 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700" />,
            inverted: false,
            arrow: false,
            onClick: () => setModal("following"),
        },
    ]

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-[2px] mt-[2px] font-mono">
                {stats.map((s) => {
                    const isClickable = !!s.onClick
                    const Tag = isClickable ? "button" : "div"

                    return (
                        <Tag
                            key={s.label}
                            onClick={s.onClick}
                            className={`relative overflow-hidden p-7 transition-all duration-300 text-left w-full
                                ${s.inverted
                                    ? "bg-black dark:bg-white text-white dark:text-black"
                                    : "bg-white dark:bg-[#0F0F0F] text-black dark:text-white border border-zinc-200 dark:border-zinc-800"
                                }
                                ${isClickable
                                    ? "cursor-pointer hover:brightness-90 dark:hover:brightness-110 active:scale-[0.98]"
                                    : "hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                                }`}
                        >
                            {!s.inverted && <DotGrid />}
                            <div className="relative z-10 flex flex-col gap-8">
                                <div className="flex items-center justify-between">
                                    <span className={`text-[9px] font-bold uppercase tracking-[0.35em] ${s.inverted ? "opacity-50" : "text-zinc-400"}`}>
                                        {s.label}
                                    </span>
                                    {s.icon}
                                </div>
                                <div>
                                    <p className="text-[52px] font-black leading-none tracking-[-0.05em]">
                                        {s.value.toLocaleString()}
                                    </p>
                                    <p className={`text-[8px] font-bold uppercase tracking-[0.25em] mt-3 flex items-center gap-1.5 ${s.inverted ? "opacity-50" : "text-zinc-400"}`}>
                                        {s.sub}
                                        {s.arrow && <ArrowUpRight size={9} />}
                                        {isClickable && <span className="ml-1 opacity-40">↗</span>}
                                    </p>
                                </div>
                            </div>
                        </Tag>
                    )
                })}
            </div>

            {modal && userId && (
                <FollowListModal
                    userId={userId}
                    mode={modal}
                    onFollowChange={(delta) => handleFollowChange(delta, modal)}
                    onClose={() => setModal(null)}
                />
            )}
        </>
    )
}