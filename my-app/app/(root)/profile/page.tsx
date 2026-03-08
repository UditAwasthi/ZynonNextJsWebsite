"use client";

import { useProfile } from "../../../src/hooks/useProfile";
import { ProfileHeader } from "../../../src/components/profile/ProfileHeader";
import { ProfileTabs } from "../../../src/components/profile/ProfileTabs";
import { ProfileStats } from "../../../src/components/profile/ProfileStatGrid";
import { Loader2 } from "lucide-react";

export default function ProfilePage() {
    const { user, loading, error } = useProfile();

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#F2F2F2] dark:bg-black">
            <Loader2 className="animate-spin text-[#FF3131]" size={32} />
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex items-center justify-center text-[#FF3131] uppercase font-black tracking-widest">
            Critical Error: {error}
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F2F2F2] dark:bg-black font-sans">
            <div className="h-48 bg-gradient-to-b from-zinc-200 to-[#F2F2F2] dark:from-zinc-900 dark:to-black" />
            <div className="max-w-4xl mx-auto px-6 -mt-24">
                <ProfileHeader user={user} />
                <ProfileStats stats={user.stats} />
                <ProfileTabs />
            </div>
        </div>
    );
}