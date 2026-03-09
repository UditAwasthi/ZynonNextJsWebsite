// src/components/profile/PublicProfileRedirect.tsx
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import PublicProfileView from "./PublicProfileView"

export default function PublicProfileRedirect({ username }: { username: string }) {
    const router = useRouter()

    useEffect(() => {
        // Read cached profile — already stored by useProfile hook
        try {
            const raw = localStorage.getItem("zynon:profile:me")
            if (!raw) return
            const { data } = JSON.parse(raw)
            if (data?.user?.username === username) {
                router.replace("/profile")
            }
        } catch { }
    }, [username, router])

    return <PublicProfileView username={username} />
}