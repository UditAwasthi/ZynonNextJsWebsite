"use client"

import React, { useState } from 'react';
import api from '../../../src/lib/api';
import { Loader2, Cpu, ChevronRight, Terminal } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ProfileSync = () => {
    const [profileData, setProfileData] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSync = async () => {
        setIsSyncing(true);
        const syncToast = toast.loading("INITIALIZING_GET_REQUEST...", {
            className: "dark:bg-zinc-900 dark:text-white border border-white/10 font-mono text-[10px] tracking-[0.2em]",
        });

        try {
            // GET request to base_url + /profile/me
            const response = await api.get('/profile/udit_awasthi_');
            
            // Set the raw JSON data
            setProfileData(response.data);
            toast.success("DATA_PACKET_RECEIVED", { id: syncToast });
        } catch (error) {
            console.error("Sync Error:", error);
            toast.error("CONNECTION_FAILED", { id: syncToast });
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-8 space-y-12">
            {!profileData ? (
                /* INITIAL STATE */
                <div className="w-full max-w-md bg-white/40 dark:bg-zinc-900/40 backdrop-blur-3xl border border-black/5 dark:border-white/5 p-10 rounded-[48px] text-center space-y-8 shadow-2xl">
                    <div className="w-20 h-20 mx-auto rounded-full border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                        <Cpu size={32} className={`${isSyncing ? 'animate-pulse text-red-500' : 'text-zinc-400'}`} />
                    </div>

                    <div className="space-y-2">
                        <h2 className="font-nothing text-3xl uppercase tracking-tighter">Profile_Fetch</h2>
                        <p className="text-[10px] font-black tracking-[0.4em] text-zinc-400 uppercase">Endpoint: /profile/me</p>
                    </div>

                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="group w-full py-6 rounded-3xl bg-black dark:bg-white text-white dark:text-black font-black uppercase text-[10px] tracking-[0.4em] flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                    >
                        {isSyncing ? (
                            <>Streaming <Loader2 size={14} className="animate-spin" /></>
                        ) : (
                            <>Fetch_JSON_Response <ChevronRight size={14} /></>
                        )}
                    </button>
                </div>
            ) : (
                /* JSON RESPONSE PRINT STATE */
                <div className="w-full max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="bg-zinc-950 rounded-[32px] border border-white/10 overflow-hidden shadow-2xl">
                        {/* Terminal Header */}
                        <div className="bg-white/5 px-6 py-4 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Terminal size={14} className="text-zinc-500" />
                                <span className="text-[9px] font-black tracking-[0.3em] text-zinc-400 uppercase">Response_Output</span>
                            </div>
                            <div className="flex gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-zinc-800" />
                                <div className="w-2 h-2 rounded-full bg-zinc-800" />
                                <div className="w-2 h-2 rounded-full bg-red-500/50" />
                            </div>
                        </div>

                        {/* Raw JSON Print */}
                        <div className="p-8 overflow-x-auto">
                            <pre className="text-xs md:text-sm font-mono text-zinc-300 leading-relaxed selection:bg-red-500/40">
                                {JSON.stringify(profileData, null, 4)}
                            </pre>
                        </div>

                        {/* Metadata Footer */}
                        <div className="bg-white/5 px-8 py-3 border-t border-white/10 flex justify-between">
                            <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Type: application/json</span>
                            <span className="text-[8px] font-bold text-green-500 uppercase tracking-widest">Status: 200 OK</span>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => setProfileData(null)}
                        className="mt-8 text-[9px] font-black tracking-[0.5em] text-zinc-400 uppercase hover:text-red-500 transition-colors mx-auto block"
                    >
                        [ Clear_Cache & Re-Sync ]
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProfileSync;