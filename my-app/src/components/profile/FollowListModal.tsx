"use client"

import { useEffect, useState } from "react"
import { X, Loader2, UserCircle2 } from "lucide-react"
import { getFollowers, getFollowing } from "../../lib/api/followApi"
import Link from "next/link"
import FollowButton from "./FollowButton"
import { getCurrentUserId } from "../../lib/auth"

type Mode = "followers" | "following"

interface FollowUser {
    _id: string
    username: string
    name?: string
    profilePicture?: string
}

interface FollowListModalProps {
    userId: string
    mode: Mode
    onClose: () => void
    onFollowChange?: (delta: number) => void  // bubbles up to parent counter
}

export default function FollowListModal({ userId, mode, onClose, onFollowChange }: FollowListModalProps) {
    const [users, setUsers] = useState<FollowUser[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)

    // Decode the viewer's own ID from the JWT — no network request needed,
    // no risk of a 401 before the token is ready on the first render.
    useEffect(() => {
        setCurrentUserId(getCurrentUserId() || null)
    }, [])

    // Fetch followers/following list
    useEffect(() => {
        if (!userId) return                              // ← guard: never fire with undefined userId

        setLoading(true)
        setError(false)

        const fetcher = mode === "followers" ? getFollowers : getFollowing

        fetcher(userId)
            .then((res) => {
                // API returns flat array: [{ _id, username, name, profilePicture }]
                setUsers(res.data.data)
            })
            .catch(() => setError(true))
            .finally(() => setLoading(false))
    }, [userId, mode])

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onClose()
    }

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [onClose])

    return (
        <div
            onClick={handleBackdropClick}
            className="fixed inset-0 z-[200] flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        >
            <div className="w-full md:max-w-md bg-white dark:bg-[#0F0F0F] border border-zinc-200 dark:border-zinc-800 rounded-t-[32px] md:rounded-[32px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 md:slide-in-from-bottom-0 duration-300">

                {/* Header */}
                <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-zinc-100 dark:border-zinc-800">
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-zinc-400">
                            {mode === "followers" ? "Verified_Nodes" : "Active_Connections"}
                        </p>
                        <h2 className="text-xl font-black tracking-tighter uppercase text-black dark:text-white mt-0.5">
                            {mode === "followers" ? "Followers" : "Following"}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 flex items-center justify-center border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* List */}
                <div className="overflow-y-auto max-h-[calc(100dvh-7.5rem-120px)] md:max-h-[60vh] divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {loading && (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 size={20} className="animate-spin text-zinc-300" />
                        </div>
                    )}

                    {error && !loading && (
                        <div className="py-16 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#E8001A]">
                                Failed_to_load
                            </p>
                        </div>
                    )}

                    {!loading && !error && users.length === 0 && (
                        <div className="py-16 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-400">
                                No_{mode}_yet
                            </p>
                        </div>
                    )}

                    {!loading && !error && users.map((user) => {
                        const isCurrentUser = currentUserId === user._id

                        return (
                            <div key={user._id} className="flex items-center gap-4 px-7 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors group">

                                {/* Avatar + Name — clickable link */}
                                <Link
                                    href={`/profile/${user.username}`}
                                    onClick={onClose}
                                    className="flex items-center gap-4 flex-1 min-w-0"
                                >
                                    <div className="w-10 h-10 border border-zinc-200 dark:border-zinc-800 overflow-hidden shrink-0 bg-zinc-100 dark:bg-zinc-900">
                                        {user.profilePicture ? (
                                            <img
                                                src={user.profilePicture}
                                                alt={user.username}
                                                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <UserCircle2 size={20} className="text-zinc-300 dark:text-zinc-700" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-black uppercase tracking-tight text-black dark:text-white truncate">
                                            {user.name || user.username}
                                        </p>
                                        <p className="text-[10px] font-medium text-zinc-400 tracking-wider truncate">
                                            @{user.username}
                                        </p>
                                    </div>
                                </Link>

                                {/* Follow button — only for other users, not self */}
                                {!isCurrentUser && (
                                    <div className="shrink-0 scale-75 origin-right">
                                        <FollowButton
                                            userId={user._id}
                                            onFollowChange={onFollowChange}
                                        />
                                    </div>
                                )}

                                {/* "You" badge for current user */}
                                {isCurrentUser && (
                                    <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest text-zinc-400 border border-zinc-200 dark:border-zinc-700 px-2 py-1 rounded-lg">
                                        You
                                    </span>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Mobile drag handle */}
                <div className="md:hidden flex justify-center py-3">
                    <div className="w-10 h-1 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                </div>
            </div>
        </div>
    )
}