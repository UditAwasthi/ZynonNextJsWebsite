// lib/userSearchCache.ts
// Combines a local in-memory cache of seen users with live API search.

import { fetchSuggestions, fetchSearchResults, type SearchUser } from "./api/search";

const userCache = new Map<string, SearchUser>();

export function cacheUsers(users: SearchUser[]) {
    for (const u of users) {
        userCache.set(u._id, u);
        userCache.set(u.username.toLowerCase(), u);
    }
}

export async function searchUsers(q: string): Promise<SearchUser[]> {
    const trimmed = q.trim().toLowerCase();
    if (!trimmed) return [];

    const seen = new Set<string>();
    const merged: SearchUser[] = [];

    for (const user of userCache.values()) {
        if (
            user.username.toLowerCase().includes(trimmed) ||
            user.name?.toLowerCase().includes(trimmed)
        ) {
            if (!seen.has(user._id)) {
                seen.add(user._id);
                merged.push(user);
            }
        }
    }

    try {
        const [suggestRes, searchRes] = await Promise.allSettled([
            fetchSuggestions(trimmed),
            fetchSearchResults(trimmed),
        ]);

        const apiUsers: SearchUser[] = [];
        if (suggestRes.status === "fulfilled") apiUsers.push(...suggestRes.value);
        if (searchRes.status === "fulfilled") apiUsers.push(...(searchRes.value.users ?? []));

        cacheUsers(apiUsers);

        for (const u of apiUsers) {
            if (!seen.has(u._id)) {
                seen.add(u._id);
                merged.push(u);
            } else {
                const idx = merged.findIndex(m => m._id === u._id);
                if (idx !== -1) merged[idx] = u;
            }
        }
    } catch {
        // network down — return local cache
    }

    return merged.slice(0, 20);
}