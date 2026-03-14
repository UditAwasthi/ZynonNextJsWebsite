// src/components/profile/PublicProfileRedirect.tsx
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import PublicProfileView from "./PublicProfileView"

export default function PublicProfileRedirect({ username }: { username: string }) {
    const router = useRouter()

    useEffect(() => {
        // useProfile stores res.data.data directly under "profile:me"
        // Shape: { user: { username, ... }, ... }  — no outer "data" wrapper
        try {
            const raw = localStorage.getItem("zynon:profile:me")
            if (!raw) return
            const entry = JSON.parse(raw)
            // cache.ts wraps every entry as { data, ts, ttl }
            const profile = entry?.data
            if (profile?.user?.username === username) {
                router.replace("/profile")
            }
        } catch { }
    }, [username, router])

    return <PublicProfileView username={username} />
}