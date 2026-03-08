import { useState, useEffect } from "react";
import api from "../lib/api";

export function useProfile() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refreshProfile = async () => {
        try {
            setLoading(true);
            const res = await api.get("profile/me");
            setUser(res.data.data);
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to sync profile");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshProfile();
    }, []);

    return { user, loading, error, refreshProfile };
}