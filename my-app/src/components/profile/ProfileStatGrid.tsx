"use client"

import { useState } from "react"
import { Layers, Users, ArrowUpRight } from "lucide-react"
import { useProfile, patchProfileCache } from "./ProfileHeader"
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
    const { profile } = useProfile()
    const [modal, setModal] = useState<"followers" | "following" | null>(null)
    const [followersDelta, setFollowersDelta] = useState(0)
    const [followingDelta, setFollowingDelta] = useState(0)

    if (!profile) return <ProfileStatsSkeleton />

    const userId = (profile.user as any)?._id ?? null

    const handleFollowChange = (delta: number, mode: "followers" | "following") => {
        if (mode === "followers") {
            setFollowersDelta(prev => {
                const next = prev + delta
                // Patch cache with the correct accumulated value
                patchProfileCache({ followersCount: Math.max(0, profile.followersCount + next) })
                return next
            })
        } else {
            setFollowingDelta(prev => {
                const next = prev + delta
                patchProfileCache({ followingCount: Math.max(0, profile.followingCount + next) })
                return next
            })
        }
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
        {/* Container: Matches ProfileHeader width with consistent spacing */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 w-full max-w-7xl mx-auto font-mono">
            {stats.map((s) => {
                const isClickable = !!s.onClick;
                const Tag = isClickable ? "button" : "div";

                return (
                    <Tag
                        key={s.label}
                        onClick={s.onClick}
                        /* Unified style for all cards: no more inversion */
                        className={`relative overflow-hidden py-6 px-8 rounded-[32px] transition-all duration-500 text-left border
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
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-500">
                                {s.label}:
                            </span>
                            
                            {/* Value Section */}
                            <div className="flex items-baseline gap-2">
                                <p className="text-3xl md:text-4xl font-black leading-none tracking-tighter">
                                    {s.value.toLocaleString()}
                                </p>
                                {isClickable && (
                                    <span className="text-[10px] text-[#FF0000] font-black uppercase tracking-tighter opacity-70">
                                        Live
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

        {modal && userId && (
            <FollowListModal
                userId={userId}
                mode={modal}
                onFollowChange={(delta) => handleFollowChange(delta, modal)}
                onClose={() => setModal(null)}
            />
        )}
    </>
);
}