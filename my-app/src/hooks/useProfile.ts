import { useState, useEffect, useCallback, useRef } from "react"
import api from "../lib/api/api"
import { cache, TTL } from "../lib/cache"

const CACHE_KEY = "profile:me"

export function useProfile() {
    const [user, setUser]       = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError]     = useState<string | null>(null)
    const mounted = useRef(true)

    const refreshProfile = useCallback(async (silent = false) => {
        if (!silent) setLoading(true)
        try {
            const res  = await api.get("profile/me")
            const data = res.data.data
            if (!mounted.current) return
            setUser(data)
            setError(null)
            cache.set(CACHE_KEY, data, TTL.PROFILE)
        } catch (err: any) {
            if (!mounted.current) return
            setError(err.response?.data?.message || "Failed to sync profile")
        } finally {
            if (mounted.current) setLoading(false)
        }
    }, [])

    useEffect(() => {
        mounted.current = true

        // Show stale data instantly (even if expired) so UI renders immediately
        const stale = cache.getStale(CACHE_KEY)
        if (stale) {
            setUser(stale)
            setLoading(false)
            // Refresh in background without showing loading state
            refreshProfile(true)
        } else {
            refreshProfile(false)
        }

        return () => { mounted.current = false }
    }, [refreshProfile])

    return { user, loading, error, refreshProfile: () => refreshProfile(false) }
}