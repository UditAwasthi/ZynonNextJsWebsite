"use client"

import { useState } from "react"
import { Grid, Bookmark, Plus } from "lucide-react"
import PostGrid from "./PostGrid"

interface ProfileTabsProps {
    userId: string
}

export const ProfileTabs = ({ userId }: ProfileTabsProps) => {
    const [activeTab, setActiveTab] = useState<"artifacts" | "vault">("artifacts")

    return (
        <div className="mt-12 space-y-12">
            {/* 1. Professional Segmented Control (Pebble Design) */}
            <div className="flex justify-center">
                <div className="inline-flex p-1.5 bg-white/50 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-[24px] shadow-sm">
                    <button
                        onClick={() => setActiveTab("artifacts")}
                        className={`px-10 py-3 text-[10px] font-black uppercase tracking-[0.25em] flex items-center gap-3 rounded-[18px] transition-all duration-300
                            ${activeTab === "artifacts"
                                ? "bg-black dark:bg-white text-white dark:text-black shadow-lg"
                                : "text-zinc-500 hover:text-black dark:hover:text-white"
                            }`}
                    >
                        <Grid size={14} strokeWidth={activeTab === "artifacts" ? 3 : 2} />
                        Artifacts
                    </button>
                    <button
                        onClick={() => setActiveTab("vault")}
                        className={`px-10 py-3 text-[10px] font-black uppercase tracking-[0.25em] flex items-center gap-3 rounded-[18px] transition-all duration-300
                            ${activeTab === "vault"
                                ? "bg-black dark:bg-white text-white dark:text-black shadow-lg"
                                : "text-zinc-500 hover:text-black dark:hover:text-white"
                            }`}
                    >
                        <Bookmark size={14} strokeWidth={activeTab === "vault" ? 3 : 2} />
                        Vault
                    </button>
                </div>
            </div>

            {/* 2. Content Area */}
            <div className="max-w-7xl mx-auto w-full">
                {activeTab === "artifacts" && (
                    <div className="pb-24 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <PostGrid userId={userId} />
                    </div>
                )}

                {activeTab === "vault" && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-24 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* Initialize Slot Button */}
                        <button className="aspect-square rounded-[40px] border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-[#FF0000] dark:hover:border-[#FF0000] transition-all duration-500 group flex flex-col items-center justify-center gap-5 bg-white/40 dark:bg-[#0A0A0A]/40 backdrop-blur-sm">
                            <div className="p-4 rounded-full border border-zinc-200 dark:border-zinc-800 group-hover:bg-[#FF0000] group-hover:border-[#FF0000] transition-all duration-500">
                                <Plus size={20} className="text-zinc-400 group-hover:text-white" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-400 group-hover:text-black dark:group-hover:text-white">
                                Initialize_Slot
                            </span>
                        </button>

                        {/* Data Missing Slots */}
                        {[1, 2].map((i) => (
                            <div key={i} className="relative aspect-square rounded-[40px] border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white/60 dark:bg-[#0A0A0A]/60 backdrop-blur-md group">
                                {/* Signature Dot Matrix */}
                                <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
                                     style={{ backgroundImage: "radial-gradient(circle, currentColor 0.8px, transparent 0.8px)", backgroundSize: "16px 16px" }} />
                                
                                <div className="absolute inset-8 border border-zinc-100 dark:border-zinc-900 rounded-[24px] flex flex-col items-center justify-center gap-3">
                                    <span className="text-[12px] font-black text-zinc-200 dark:text-zinc-800">00{i}</span>
                                    <div className="w-6 h-[1px] bg-zinc-100 dark:bg-zinc-900" />
                                    <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-zinc-400">Void_Index</span>
                                </div>
                                
                                <div className="absolute inset-0 bg-black dark:bg-white opacity-0 group-hover:opacity-[0.03] transition-opacity cursor-not-allowed" />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}