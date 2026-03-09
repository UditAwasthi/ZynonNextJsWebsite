"use client"

import { useState } from "react"
import { Grid, Bookmark, Plus } from "lucide-react"
import PostGrid from "./PostGrid"

interface ProfileTabsProps {
    userId: string // profile.user._id
}

export const ProfileTabs = ({ userId }: ProfileTabsProps) => {
    const [activeTab, setActiveTab] = useState<"artifacts" | "vault">("artifacts")

    return (
        <div className="mt-16 space-y-10">
            {/* Segmented Tab Control */}
            <div className="flex justify-center">
                <div className="flex p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <button
                        onClick={() => setActiveTab("artifacts")}
                        className={`px-8 py-2 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all
                            ${activeTab === "artifacts"
                                ? "bg-black dark:bg-white text-white dark:text-black"
                                : "text-zinc-500 hover:text-black dark:hover:text-white"
                            }`}
                    >
                        <Grid size={14} strokeWidth={2.5} />
                        Artifacts
                    </button>
                    <button
                        onClick={() => setActiveTab("vault")}
                        className={`px-8 py-2 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all
                            ${activeTab === "vault"
                                ? "bg-black dark:bg-white text-white dark:text-black"
                                : "text-zinc-500 hover:text-black dark:hover:text-white"
                            }`}
                    >
                        <Bookmark size={14} strokeWidth={1.5} />
                        Vault
                    </button>
                </div>
            </div>

            {/* Artifacts Tab — Posts Grid */}
            {activeTab === "artifacts" && (
                <div className="pb-24">
                    <PostGrid userId={userId} />
                </div>
            )}

            {/* Vault Tab — placeholder */}
            {activeTab === "vault" && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pb-24">
                    {/* Create New Slot */}
                    <button className="aspect-square border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-black dark:hover:border-white transition-colors group flex flex-col items-center justify-center gap-4 bg-zinc-50/50 dark:bg-zinc-900/20">
                        <div className="p-3 rounded-full border border-zinc-300 dark:border-zinc-800 group-hover:rotate-90 transition-transform duration-500">
                            <Plus size={20} className="text-zinc-400 group-hover:text-black dark:group-hover:text-white" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400 group-hover:text-black dark:group-hover:text-white">
                            Initialize Slot
                        </span>
                    </button>

                    {[1, 2].map((i) => (
                        <div key={i} className="relative aspect-square border border-zinc-300 dark:border-zinc-800 overflow-hidden bg-white dark:bg-black group">
                            <div className="absolute inset-0 nothing-dot-grid opacity-[0.1] pointer-events-none" />
                            <div className="absolute inset-4 border border-zinc-100 dark:border-zinc-900 flex flex-col items-center justify-center gap-2">
                                <span className="text-[10px] font-nothing text-zinc-300 dark:text-zinc-700">00{i}</span>
                                <div className="w-8 h-[1px] bg-zinc-200 dark:border-zinc-800" />
                                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Data Missing</span>
                            </div>
                            <div className="absolute inset-0 bg-black dark:bg-white opacity-0 group-hover:opacity-10 transition-opacity cursor-pointer" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}