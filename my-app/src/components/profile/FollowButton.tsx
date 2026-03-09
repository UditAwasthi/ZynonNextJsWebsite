"use client"

import { useEffect, useState } from "react"
import { UserPlus, Check, Clock, Loader2 } from "lucide-react"
import {
    getFollowStatus,
    followUser,
    unfollowUser,
    cancelFollowRequest,
} from "../../lib/api/followApi"

// Matches API status values exactly
// API returns: "following" | "requested" | "not_following"
type FollowState = "not_following" | "requested" | "following"

interface FollowButtonProps {
    userId: string
    // delta: +1 when followed (public), -1 when unfollowed, 0 for requested/cancelled
    onFollowChange?: (delta: number) => void
}

export default function FollowButton({ userId, onFollowChange }: FollowButtonProps) {
    const [state, setState] = useState<FollowState>("not_following")
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null
        if (!token) { setLoading(false); return }

        getFollowStatus(userId)
            .then((res) => {
                // API: { success, data: { status: "following" | "requested" | "not_following" } }
                const status: FollowState = res.data.data.status
                setState(status)
            })
            .catch(() => setState("not_following"))
            .finally(() => setLoading(false))
    }, [userId])

    const handleClick = async () => {
        const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null
        if (!token) { window.location.href = "/login"; return }

        setLoading(true)
        try {
            if (state === "not_following") {
                const res = await followUser(userId)
                // API message tells us if it was followed or requested
                const wasRequested = res.data.message === "Follow request sent"
                if (wasRequested) {
                    setState("requested")
                    // pending — no follower count change yet
                } else {
                    setState("following")
                    onFollowChange?.(+1)
                }
            } else if (state === "following") {
                await unfollowUser(userId)
                setState("not_following")
                onFollowChange?.(-1)
            } else if (state === "requested") {
                await cancelFollowRequest(userId)
                setState("not_following")
                // no count change — request never incremented it
            }
        } catch {
            // silently fail — state stays as-is
        } finally {
            setLoading(false)
        }
    }

    const config: Record<FollowState, { label: string; icon: React.ReactNode; className: string }> = {
        not_following: {
            label: "Follow",
            icon: <UserPlus size={12} />,
            className: "bg-black dark:bg-white text-white dark:text-black hover:invert",
        },
        requested: {
            label: "Requested",
            icon: <Clock size={12} />,
            className: "bg-transparent text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900",
        },
        following: {
            label: "Following",
            icon: <Check size={12} />,
            className: "bg-transparent text-black dark:text-white hover:bg-red-50 hover:border-red-500 hover:text-red-500 dark:hover:bg-red-950 dark:hover:border-red-500 dark:hover:text-red-400",
        },
    }

    const { label, icon, className } = config[state]

    return (
        <button
            onClick={handleClick}
            disabled={loading}
            className={`w-40 md:w-48 h-11 border-2 border-black dark:border-white font-bold uppercase text-[9px] tracking-[0.25em] flex items-center justify-center gap-2.5 transition-all active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)] disabled:opacity-40 ${className}`}
        >
            {loading
                ? <Loader2 size={12} className="animate-spin" />
                : <>{icon} {label}</>
            }
        </button>
    )
}