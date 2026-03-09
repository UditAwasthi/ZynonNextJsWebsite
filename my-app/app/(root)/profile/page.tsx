"use client";

import { ProfileHeader, useProfile } from "../../../src/components/profile/ProfileHeader";
import { ProfileTabs } from "../../../src/components/profile/ProfileTabs";
import { ProfileStats } from "../../../src/components/profile/ProfileStatGrid";

export default function ProfilePage() {
    const { profile } = useProfile()

    return (
        <div className="min-h-screen bg-[#F2F2F2] dark:bg-black font-sans">
            <div className="h-48 bg-gradient-to-b from-zinc-200 to-[#F2F2F2] dark:from-zinc-900 dark:to-black" />
            <div className="max-w-4xl mx-auto px-6 -mt-24">
                <ProfileHeader />
                <ProfileStats />
                {/* Only render tabs once profile is loaded so userId is available */}
                {profile && <ProfileTabs userId={(profile.user as any)._id} />}
            </div>
        </div>
    );
}