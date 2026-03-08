import { Users, Layers, ArrowUpRight } from "lucide-react";

interface ProfileStatsProps {
    stats: {
        followers: number;
        following: number;
        posts: number;
    };
}

export const ProfileStats = ({ stats }: ProfileStatsProps) => (
    /* Tightened gap and margin */
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
        
        {/* Posts / Deployments */}
        <div className="relative overflow-hidden bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 p-6 group transition-all hover:border-black dark:hover:border-white">
            <div className="absolute inset-0 nothing-dot-grid opacity-[0.05] pointer-events-none" />
            <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-6">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400">Total Posts</span>
                    <Layers size={14} className="text-zinc-300 dark:text-zinc-700" />
                </div>
                <div>
                    <p className="font-nothing text-5xl text-black dark:text-white leading-none">
                      23
                    </p>
                    <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-zinc-500 mt-3 flex items-center gap-2">
                        System Logs <ArrowUpRight size={10} />
                    </p>
                </div>
            </div>
        </div>

        {/* Followers - Inverted Theme */}
        <div className="relative overflow-hidden bg-black dark:bg-white border border-black dark:border-white p-6 text-white dark:text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.05)]">
            <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-6">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] opacity-60">Followers</span>
                    <Users size={14} />
                </div>
                <div>
                    <p className="font-nothing text-5xl leading-none">
                       2
                    </p>
                    <p className="text-[8px] font-bold uppercase tracking-[0.2em] mt-3 opacity-60">Verified Nodes</p>
                </div>
            </div>
        </div>

        {/* Following */}
        <div className="relative overflow-hidden bg-white dark:bg-black border border-zinc-300 dark:border-zinc-800 p-6 group transition-all hover:border-black dark:hover:border-white">
            <div className="absolute inset-0 nothing-dot-grid opacity-[0.05] pointer-events-none" />
            <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-6">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400">Following</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                </div>
                <div>
                    <p className="font-nothing text-5xl text-black dark:text-white leading-none">
                      5
                    </p>
                    <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-zinc-500 mt-3">Active Connections</p>
                </div>
            </div>
        </div>
    </div>
);