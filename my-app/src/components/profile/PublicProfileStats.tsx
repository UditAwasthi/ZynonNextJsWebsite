"use client"

import { Grid, Users, ArrowUpRight } from "lucide-react"

interface PublicProfileStatsProps {
    postsCount: number
    followersCount: number
    followingCount: number
    onFollowersClick: () => void
    onFollowingClick: () => void
}

/* ─── SKELETON ─── */
export const PublicProfileStatsSkeleton = () => (
    <div className="animate-pulse grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 w-full max-w-7xl mx-auto">
        {[1, 2, 3].map(i => (
            <div key={i} className="h-[120px] bg-zinc-100 dark:bg-zinc-900 rounded-[32px] border border-zinc-200 dark:border-zinc-800" />
        ))}
    </div>
)

export function PublicProfileStats({ 
    postsCount, 
    followersCount, 
    followingCount, 
    onFollowersClick, 
    onFollowingClick 
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

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 w-full max-w-7xl mx-auto font-mono">
            {stats.map((s) => {
                const isClickable = !!s.onClick;
                const Tag = isClickable ? "button" : "div";

                return (
                    <Tag
                        key={s.label}
                        onClick={s.onClick}
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
    )
}