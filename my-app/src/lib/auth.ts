// lib/auth.ts
export const getAccessToken = (): string => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("accessToken") || "";
};

export const getCurrentUserId = (): string => {
    if (typeof window === "undefined") return "";
    const token = localStorage.getItem("accessToken");
    if (!token) return "";
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload.id || payload._id || payload.userId || "";
    } catch {
        return "";
    }
};