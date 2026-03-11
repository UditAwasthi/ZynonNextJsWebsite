"use client"

import { useState, useEffect } from "react"
import { X, CheckCircle2, XCircle } from "lucide-react"

/* ─── TYPES ─── */
type UploadStatus = "uploading" | "success" | "error"

export interface UploadState {
    visible: boolean
    status: UploadStatus
    progress: number
    fileCount: number
    message: string
}

/* ─── MODULE-LEVEL STORE ─── */
let _state: UploadState = {
    visible: false, status: "uploading",
    progress: 0, fileCount: 0, message: ""
}
let _listeners: Array<(s: UploadState) => void> = []
export function setUploadState(patch: Partial<UploadState>) {
    _state = { ..._state, ...patch }
    setTimeout(() => {
        _listeners.forEach(fn => fn({ ..._state }))
    }, 0)
}

export function useUploadStore() {
    const [state, setState] = useState<UploadState>({ ..._state })
    useEffect(() => {
        setState({ ..._state }) // sync on mount
        _listeners.push(setState)
        return () => { _listeners = _listeners.filter(fn => fn !== setState) }
    }, [])
    return { state, dismiss: () => setUploadState({ visible: false }) }
}

/* ─── OVERLAY WIDGET ─── */
export function UploadProgressWidget() {
    const { state, dismiss } = useUploadStore()

    if (!state.visible) return null

    return (
        <>
            <style>{`
                @keyframes floatUp {
                    from { opacity:0; transform:translateY(20px) scale(0.93); }
                    to   { opacity:1; transform:translateY(0) scale(1); }
                }
                .upload-overlay-enter { animation: floatUp 0.45s cubic-bezier(0.34,1.56,0.64,1) both; }
            `}</style>

            <div className="fixed bottom-6 right-6 z-[999] w-72 font-mono upload-overlay-enter">
                <div className={`relative rounded-[22px] overflow-hidden shadow-2xl border
                    ${state.status === "error"
                        ? "bg-white dark:bg-zinc-900 border-[#E8001A]/20"
                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                    }`}
                >
                    {/* Animated top progress bar */}
                    <div className="h-[3px] bg-zinc-100 dark:bg-zinc-800">
                        <div
                            className={`h-full transition-all duration-500 ease-out
                                ${state.status === "success" ? "bg-emerald-500" :
                                    state.status === "error" ? "bg-[#E8001A]" :
                                        "bg-[#E8001A]"}`}
                            style={{ width: state.status === "uploading" ? `${state.progress}%` : "100%" }}
                        />
                    </div>

                    <div className="p-5 space-y-4">
                        {/* Row 1 — status label + dismiss */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {state.status === "uploading" && (
                                    <span className="relative flex w-2 h-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E8001A] opacity-75" />
                                        <span className="relative inline-flex rounded-full w-2 h-2 bg-[#E8001A]" />
                                    </span>
                                )}
                                {state.status === "success" && <CheckCircle2 size={13} className="text-emerald-500" />}
                                {state.status === "error" && <XCircle size={13} className="text-[#E8001A]" />}
                                <span className="text-[9px] font-bold uppercase tracking-[0.35em] text-zinc-400">
                                    {state.status === "uploading" ? "Active_Stream" :
                                        state.status === "success" ? "Uplink_Synced" :
                                            "Uplink_Failed"}
                                </span>
                            </div>
                            {state.status !== "uploading" && (
                                <button
                                    onClick={dismiss}
                                    className="text-zinc-300 dark:text-zinc-600 hover:text-black dark:hover:text-white transition-colors p-0.5"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>

                        {/* Row 2 — progress track */}
                        <div className="h-[2px] w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500
                                    ${state.status === "success" ? "bg-emerald-500" :
                                        state.status === "error" ? "bg-[#E8001A]" :
                                            "bg-[#E8001A]"}`}
                                style={{ width: state.status === "uploading" ? `${state.progress}%` : "100%" }}
                            />
                        </div>

                        {/* Row 3 — big number + sublabel */}
                        <div className="flex items-baseline justify-between">
                            {state.status === "uploading" && (
                                <>
                                    <span className="text-[44px] font-black tracking-[-0.05em] leading-none text-black dark:text-white tabular-nums">
                                        {state.progress}%
                                    </span>
                                    <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-zinc-400 text-right">
                                        {state.fileCount} file{state.fileCount !== 1 ? "s" : ""}
                                    </span>
                                </>
                            )}
                            {state.status === "success" && (
                                <>
                                    <span className="text-[44px] font-black tracking-[-0.05em] leading-none text-emerald-500">OK</span>
                                    <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-zinc-400">Post_Live</span>
                                </>
                            )}
                            {state.status === "error" && (
                                <>
                                    <span className="text-[44px] font-black tracking-[-0.05em] leading-none text-[#E8001A]">ERR</span>
                                    <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-zinc-400 max-w-[130px] text-right leading-relaxed">
                                        {state.message || "Upload_Failed"}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}