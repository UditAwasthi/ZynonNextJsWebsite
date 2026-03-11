/**
 * cache.ts — Unified localStorage-backed cache with stale-while-revalidate
 *
 * Usage:
 *   import { cache, swr } from "@/lib/cache"
 *
 *   // Read / write manually
 *   cache.get<MyType>("my:key")
 *   cache.set("my:key", data, 5 * 60_000)   // 5 min TTL
 *   cache.invalidate("my:key")
 *
 *   // Stale-while-revalidate pattern (show cached instantly, refresh in bg)
 *   await swr("my:key", fetcher, onData, onError, ttl)
 */

// ─── Types ────────────────────────────────────────────────────────────────────
interface CacheEntry<T> {
    data: T
    ts: number
    ttl: number
}

// ─── Default TTLs (ms) ────────────────────────────────────────────────────────
export const TTL = {
    PROFILE:          5 * 60_000,   // 5 min  — own profile header + stats
    POSTS_PAGE:       3 * 60_000,   // 3 min  — own post grid pages
    PUBLIC_PROFILE:   5 * 60_000,   // 5 min  — public profile view
    PUBLIC_POSTS_PAGE: 3 * 60_000,  // 3 min  — public post grid pages
}

// ─── Core cache object ────────────────────────────────────────────────────────
export const cache = {
    /**
     * Read a cached value. Returns null if missing or expired.
     */
    get<T>(key: string): T | null {
        if (typeof window === "undefined") return null
        try {
            const raw = localStorage.getItem(`zynon:${key}`)
            if (!raw) return null
            const entry: CacheEntry<T> = JSON.parse(raw)
            if (Date.now() - entry.ts > entry.ttl) {
                localStorage.removeItem(`zynon:${key}`)
                return null
            }
            return entry.data
        } catch {
            return null
        }
    },

    /**
     * Read a stale value even if expired — used for instant rendering
     * while a fresh fetch is in flight.
     */
    getStale<T>(key: string): T | null {
        if (typeof window === "undefined") return null
        try {
            const raw = localStorage.getItem(`zynon:${key}`)
            if (!raw) return null
            const entry: CacheEntry<T> = JSON.parse(raw)
            return entry.data
        } catch {
            return null
        }
    },

    /**
     * Write a value with a TTL. Silently ignores storage errors (private mode etc.)
     */
    set<T>(key: string, data: T, ttl: number = TTL.PROFILE): void {
        if (typeof window === "undefined") return
        try {
            const entry: CacheEntry<T> = { data, ts: Date.now(), ttl }
            localStorage.setItem(`zynon:${key}`, JSON.stringify(entry))
        } catch { }
    },

    /**
     * Patch (merge) a cached object — useful for updating a field without
     * refetching everything (e.g. follower count delta).
     */
    patch<T extends object>(key: string, patch: Partial<T>): void {
        if (typeof window === "undefined") return
        try {
            const raw = localStorage.getItem(`zynon:${key}`)
            if (!raw) return
            const entry: CacheEntry<T> = JSON.parse(raw)
            entry.data = { ...entry.data, ...patch }
            entry.ts = Date.now()
            localStorage.setItem(`zynon:${key}`, JSON.stringify(entry))
        } catch { }
    },

    /**
     * Delete a cached entry.
     */
    invalidate(key: string): void {
        if (typeof window === "undefined") return
        try { localStorage.removeItem(`zynon:${key}`) } catch { }
    },

    /**
     * Delete all cache entries whose key starts with a prefix.
     * e.g. cache.invalidatePrefix("posts:userId") clears all paginated pages.
     */
    invalidatePrefix(prefix: string): void {
        if (typeof window === "undefined") return
        try {
            const fullPrefix = `zynon:${prefix}`
            Object.keys(localStorage)
                .filter(k => k.startsWith(fullPrefix))
                .forEach(k => localStorage.removeItem(k))
        } catch { }
    },
}

// ─── Stale-While-Revalidate helper ────────────────────────────────────────────
/**
 * swr — show cached data immediately (even if stale), then fetch fresh data
 * and call onData again when it arrives.
 *
 * @param key        Cache key (without "zynon:" prefix)
 * @param fetcher    Async function that returns fresh data
 * @param onData     Called with (data, fromCache: boolean)
 * @param onError    Called if the fresh fetch fails AND there was no cached data
 * @param ttl        How long to consider data "fresh" (default: TTL.PROFILE)
 */
export async function swr<T>(
    key: string,
    fetcher: () => Promise<T>,
    onData: (data: T, fromCache: boolean) => void,
    onError?: (err: unknown) => void,
    ttl: number = TTL.PROFILE,
): Promise<void> {
    // 1. Serve stale data immediately (even if expired — better than blank screen)
    const stale = cache.getStale<T>(key)
    if (stale !== null) {
        onData(stale, true)
    }

    // 2. Always fetch fresh data in background
    try {
        const fresh = await fetcher()
        cache.set(key, fresh, ttl)
        onData(fresh, false)
    } catch (err) {
        // Only surface the error if we had nothing to show
        if (stale === null) onError?.(err)
    }
}