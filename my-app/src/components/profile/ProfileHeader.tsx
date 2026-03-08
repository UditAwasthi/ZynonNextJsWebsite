import { MapPin, Globe, Lock, Edit3, Share2, ShieldCheck } from "lucide-react";
import Link from "next/link"; // Added Link for navigation

interface ProfileHeaderProps {
    user: any;
}

export const ProfileHeader = ({ user }: ProfileHeaderProps) => (
    <div className="relative overflow-hidden bg-white/40 dark:bg-black/40 backdrop-blur-3xl border border-zinc-300 dark:border-zinc-800 p-8 md:p-12 shadow-sm transition-all duration-500">
        {/* Subtle Dot Matrix Background Layer */}
        <div className="absolute inset-0 nothing-dot-grid opacity-[0.03] dark:opacity-[0.08] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row gap-10 md:gap-16 items-start">
            
            {/* 1. IDENTITY COLUMN (Avatar + Edit Profile) */}
            <div className="flex flex-col gap-4 shrink-0 mx-auto md:mx-0">
                <div className="relative">
                    {/* Profile Image Widget */}
                    <div className="w-40 h-40 md:w-52 md:h-52 border-2 border-black dark:border-white p-1.5 bg-white dark:bg-black shadow-[10px_10px_0px_0px_rgba(0,0,0,0.05)]">
                        <div className="w-full h-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                            <img 
                                src={user?.profilePicture || "/default-avatar.png"} 
                                alt="Profile" 
                                className="w-full h-full object-cover grayscale transition-all duration-1000 hover:grayscale-0 hover:scale-110"
                            />
                        </div>
                    </div>
                    {user?.isPrivate && (
                        <div className="absolute -top-3 -right-3 bg-black dark:bg-white p-2 border border-zinc-300 dark:border-zinc-700 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                            <Lock size={12} className="text-white dark:text-black" />
                        </div>
                    )}
                </div>

                {/* Edit Profile Button - Wrapped in Link */}
                <Link href="/profile/editprofile" className="block">
                    <button className="w-40 md:w-52 h-12 border-2 border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 hover:invert transition-all active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                        <Edit3 size={14} /> 
                        Edit Profile
                    </button>
                </Link>
            </div>

            {/* 2. DATA STAGE (Info & Bottom Utility Row) */}
            <div className="flex-1 flex flex-col w-full min-h-[212px] md:min-h-[276px]">
                
                {/* Name Section */}
                <div className="space-y-2 mb-8">
                    <div className="flex items-center gap-4">
                        <h1 className="font-nothing text-5xl md:text-7xl tracking-tighter text-black dark:text-white uppercase leading-none">
                            {user?.name}
                        </h1>
                        <ShieldCheck size={24} className="text-zinc-400 dark:text-zinc-600 shrink-0 hidden md:block" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">
                         System Operational / {user?.isPrivate ? "P-L0CKED" : "P-OPEN"}
                    </p>
                </div>

                {/* Bio Block */}
                <div className="flex-1">
                    <p className="text-[14px] md:text-[16px] font-medium text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed tracking-tight border-l-2 border-zinc-200 dark:border-zinc-800 pl-6">
                        {user?.bio || "Synchronizing biometric data for operator verification..."}
                    </p>
                </div>

                {/* UTILITY ROW */}
                <div className="flex flex-wrap items-center justify-between gap-y-6 pt-8 mt-6 border-t border-zinc-200/60 dark:border-zinc-800/60">
                    <div className="flex flex-wrap items-center gap-x-12 gap-y-4">
                        {user?.location && (
                            <div className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                                <MapPin size={14} className="text-zinc-300 dark:text-zinc-600" /> 
                                <span>{user.location}</span>
                            </div>
                        )}
                        {user?.website && (
                            <a href={user.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-black dark:hover:text-white transition-all group">
                                <Globe size={14} className="text-zinc-300 dark:text-zinc-600 group-hover:rotate-12 transition-transform" /> 
                                <span className="underline decoration-zinc-200 dark:decoration-zinc-800 underline-offset-4">
                                    {user.website.replace(/^https?:\/\//, '')}
                                </span>
                            </a>
                        )}
                    </div>

                    {/* Share Button Integrated into the Row */}
                    <button className="flex items-center gap-3 px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:border-black dark:hover:border-white transition-all group active:scale-90">
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400 group-hover:text-black dark:group-hover:text-white">Share</span>
                        <Share2 size={16} className="text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                    </button>
                </div>

            </div>
        </div>
    </div>
);