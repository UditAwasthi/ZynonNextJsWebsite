import { useState, useEffect } from "react";
import api from "../lib/api";

const CACHE_KEY = "zynon:profile:me";
const CACHE_TTL = 60_000;

function readCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts > CACHE_TTL) return null;
        return data;
    } catch { return null; }
}

function writeCache(data: any) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
    } catch { }
}

export function useProfile() {
    // 👇 Always start as null/true on server AND client first render
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refreshProfile = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const res = await api.get("profile/me");
            const data = res.data.data;
            setUser(data);
            writeCache(data);
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to sync profile");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // 👇 Only runs client-side, after hydration is complete
        const cached = readCache();
        if (cached) {
            setUser(cached);
            setLoading(false);
            refreshProfile(true); // silent background refresh
        } else {
            refreshProfile(false);
        }
    }, []);

    return { user, loading, error, refreshProfile };
}