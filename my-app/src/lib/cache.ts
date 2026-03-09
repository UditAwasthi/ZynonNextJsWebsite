type CacheEntry<T> = {
    data: T
    timestamp: number
}

const store = new Map<string, CacheEntry<unknown>>()

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes — treat as "fresh", skip revalidation

export const cache = {
    get<T>(key: string): T | null {
        const entry = store.get(key)
        if (!entry) return null
        return entry.data as T
    },

    set<T>(key: string, data: T): void {
        store.set(key, { data, timestamp: Date.now() })
    },

    isFresh(key: string): boolean {
        const entry = store.get(key)
        if (!entry) return false
        return Date.now() - entry.timestamp < CACHE_TTL
    },

    invalidate(key: string): void {
        store.delete(key)
    },

    invalidatePrefix(prefix: string): void {
        for (const key of store.keys()) {
            if (key.startsWith(prefix)) store.delete(key)
        }
    },
}

/**
 * Stale-while-revalidate fetch wrapper.
 *
 * 1. If cache has data → call onData immediately with stale data
 * 2. Always fires the fetcher (unless fresh within TTL)
 * 3. If server response differs → call onData again with fresh data
 *
 * @param key        - Cache key
 * @param fetcher    - Async function that returns data
 * @param onData     - Called with data (may be called twice: stale then fresh)
 * @param onError    - Called if fetcher throws and no cached data exists
 * @param force      - Skip TTL check and always revalidate
 */
export async function swr<T>(
    key: string,
    fetcher: () => Promise<T>,
    onData: (data: T, fromCache: boolean) => void,
    onError?: (err: unknown) => void,
    force = false
): Promise<void> {
    const cached = cache.get<T>(key)

    // Serve stale immediately
    if (cached) onData(cached, true)

    // Skip network if still fresh and not forced
    if (!force && cache.isFresh(key)) return

    try {
        const fresh = await fetcher()

        // Only update if data actually changed
        if (JSON.stringify(fresh) !== JSON.stringify(cached)) {
            cache.set(key, fresh)
            onData(fresh, false)
        } else {
            // Data unchanged — just refresh the timestamp
            cache.set(key, fresh)
        }
    } catch (err) {
        // If we already served cached data, don't trigger error
        if (!cached) onError?.(err)
    }
}