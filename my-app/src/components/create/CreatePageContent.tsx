"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import api from "../../lib/api/api" // ← adjust path
import {
    Plus, X, Globe, Lock, Loader2,
    CheckCircle2, XCircle, ChevronDown, ChevronUp, ImageIcon
} from "lucide-react"

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL UPLOAD STORE — module-level so it survives page navigation
// ─────────────────────────────────────────────────────────────────────────────
type UploadStatus = "uploading" | "success" | "error"

interface UploadJob {
    status: UploadStatus
    progress: number       // 0–100
    fileCount: number
    previewUrl: string     // thumbnail of first file
    message: string        // error text
}

let _job: UploadJob | null = null
let _listeners: Array<(j: UploadJob | null) => void> = []

function setJob(patch: Partial<UploadJob> | null) {
    _job = patch === null ? null : { ..._job!, ...patch }
    _listeners.forEach(fn => fn(_job ? { ..._job } : null))
}

function useJob() {
    const [job, set] = useState<UploadJob | null>(_job)
    useEffect(() => {
        set(_job)
        _listeners.push(set)
        return () => { _listeners = _listeners.filter(fn => fn !== set) }
    }, [])
    return job
}

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD PROGRESS WIDGET — exported, place once in MainLayout
// ─────────────────────────────────────────────────────────────────────────────
export function UploadProgressWidget() {
    const job = useJob()
    const [collapsed, setCollapsed] = useState(false)

    if (!job || typeof document === "undefined") return null

    const done  = job.status === "success"
    const error = job.status === "error"

    return createPortal(
        <div
            className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] font-mono"
            style={{ animation: "wUp 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}
        >
            <style>{`
                @keyframes wUp {
                    from { opacity:0; transform:translateX(-50%) translateY(14px) scale(0.95); }
                    to   { opacity:1; transform:translateX(-50%) translateY(0)     scale(1);    }
                }
                @keyframes barShimmer {
                    0%   { background-position:-200% center; }
                    100% { background-position: 200% center; }
                }
                .bar-shimmer {
                    background: linear-gradient(90deg,#c80015 0%,#ff3b3b 40%,#c80015 60%,#c80015 100%);
                    background-size: 200% 100%;
                    animation: barShimmer 1.4s ease infinite;
                }
            `}</style>

            <div className={`
                flex items-center gap-3 pl-3 pr-4 py-2.5
                bg-white dark:bg-zinc-900
                border border-zinc-200 dark:border-zinc-800
                rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/40
                transition-all duration-300
                ${collapsed ? "w-auto" : "w-[300px]"}
            `}>
                {/* Thumbnail with ring */}
                <div className="relative shrink-0 w-9 h-9 rounded-[10px] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    {job.previewUrl
                        ? <img src={job.previewUrl} className="w-full h-full object-cover" alt="" />
                        : <ImageIcon size={16} className="absolute inset-0 m-auto text-zinc-400" />
                    }
                    {/* SVG progress ring */}
                    {!done && !error && (
                        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="3.5" />
                            <circle
                                cx="18" cy="18" r="15" fill="none"
                                stroke="#E8001A" strokeWidth="3.5"
                                strokeLinecap="round"
                                strokeDasharray={`${(job.progress / 100) * 94.2} 94.2`}
                                style={{ transition: "stroke-dasharray 0.35s ease" }}
                            />
                        </svg>
                    )}
                    {done && (
                        <div className="absolute inset-0 bg-emerald-500/90 flex items-center justify-center">
                            <CheckCircle2 size={16} className="text-white" strokeWidth={2.5} />
                        </div>
                    )}
                    {error && (
                        <div className="absolute inset-0 bg-[#E8001A]/90 flex items-center justify-center">
                            <XCircle size={16} className="text-white" strokeWidth={2.5} />
                        </div>
                    )}
                </div>

                {/* Body — hidden when collapsed */}
                {!collapsed && (
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black dark:text-white truncate">
                            {done  ? "Post published"   :
                             error ? "Upload failed"    :
                                     "Publishing post..."}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex-1 h-[3px] bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        done  ? "bg-emerald-500" :
                                        error ? "bg-[#E8001A]"  :
                                                "bar-shimmer"
                                    }`}
                                    style={{ width: done || error ? "100%" : `${job.progress}%` }}
                                />
                            </div>
                            <span className="text-[9px] font-bold tabular-nums text-zinc-400 shrink-0 w-8 text-right">
                                {done  ? "✓"            :
                                 error ? "!"            :
                                         `${job.progress}%`}
                            </span>
                        </div>
                        {error && job.message && (
                            <p className="text-[8px] text-[#E8001A] mt-1 truncate opacity-80">{job.message}</p>
                        )}
                    </div>
                )}

                {/* Controls */}
                <div className="flex items-center gap-0.5 shrink-0">
                    <button
                        onClick={() => setCollapsed(c => !c)}
                        title={collapsed ? "Expand" : "Collapse"}
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-zinc-300 dark:text-zinc-600 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                    >
                        {collapsed ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>
                    {(done || error) && (
                        <button
                            onClick={() => setJob(null)}
                            title="Dismiss"
                            className="w-6 h-6 flex items-center justify-center rounded-lg text-zinc-300 dark:text-zinc-600 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                        >
                            <X size={11} />
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE PAGE CONTENT
// ─────────────────────────────────────────────────────────────────────────────
interface Props {
    /**
     * Called the instant the user hits submit.
     * The modal should close here — upload continues in background.
     * Example: onSubmit={() => setCreateOpen(false)}
     */
    onSubmit?: () => void
}

export default function CreatePageContent({ onSubmit }: Props) {
    const router = useRouter()
    const [mounted, setMounted]           = useState(false)
    const [files, setFiles]               = useState<any[]>([])
    const [caption, setCaption]           = useState("")
    const [visibility, setVisibility]     = useState("public")
    const [submitting, setSubmitting]     = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(0)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => { setMounted(true) }, [])

    // ── File helpers ──────────────────────────────────────────────────────────
    const addFiles = useCallback((incoming: FileList) => {
        const valid = Array.from(incoming).filter(f => {
            if (!f.type.startsWith("image/") && !f.type.startsWith("video/")) return false
            if (f.size > 20 * 1024 * 1024) { toast.error(`${f.name.slice(0, 12)}... exceeds 20MB`); return false }
            return true
        })
        setFiles(prev => [...prev, ...valid.map(f => ({
            file: f,
            preview: URL.createObjectURL(f),
            type: f.type.startsWith("image/") ? "image" : "video"
        }))])
    }, [])

    const removeFile = useCallback((index: number) => {
        setFiles(prev => {
            URL.revokeObjectURL(prev[index].preview)
            const next = prev.filter((_, i) => i !== index)
            setSelectedIndex(i => Math.min(i, Math.max(0, next.length - 1)))
            return next
        })
    }, [])

    // ── Submit: close modal + redirect immediately, upload in background ───────
    const handleSubmit = async () => {
        if (!files.length || submitting) return
        setSubmitting(true)

        // Snapshot everything before closing modal (state will be gone)
        const captionSnap    = caption
        const visibilitySnap = visibility
        const filesSnap      = [...files]
        const previewUrl     = filesSnap[0]?.preview ?? ""

        // 1️⃣  Close modal immediately + redirect — user is unblocked
        onSubmit?.()
        router.push("/profile")

        // 2️⃣  Show progress widget
        setJob({
            status: "uploading",
            progress: 0,
            fileCount: filesSnap.length,
            previewUrl,
            message: ""
        })

        // 3️⃣  Upload in background
        try {
            const progressMap: Record<number, number> = {}

            const uploadOne = (f: any, index: number): Promise<any> =>
                new Promise(async (resolve, reject) => {
                    const sigRes = await api.get("content/media/signature")
                    const sig = sigRes.data
                    const fd = new FormData()
                    fd.append("file", f.file)
                    fd.append("api_key", sig.apiKey)
                    fd.append("timestamp", sig.timestamp)
                    fd.append("signature", sig.signature)
                    fd.append("folder", "zynon/posts")

                    const xhr = new XMLHttpRequest()
                    xhr.upload.addEventListener("progress", (e) => {
                        if (!e.lengthComputable) return
                        progressMap[index] = e.loaded / e.total
                        const overall = Math.round(
                            Object.values(progressMap).reduce((a, b) => a + b, 0) / filesSnap.length * 100
                        )
                        setJob({ progress: Math.min(overall, 99) }) // hold at 99 until API call done
                    })
                    xhr.onreadystatechange = () => {
                        if (xhr.readyState !== 4) return
                        const data = JSON.parse(xhr.responseText)
                        xhr.status === 200 ? resolve(data) : reject(data)
                    }
                    xhr.open("POST", `https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`)
                    xhr.send(fd)
                })

            const results = await Promise.all(filesSnap.map((f, i) => uploadOne(f, i)))

            const media = results.map(r => ({
                url: r.secure_url,
                publicId: r.public_id,
                width: r.width,
                height: r.height,
                ...(r.duration && { duration: r.duration }),
                type: r.resource_type === "video" ? "video" : "image"
            }))

            await api.post("content/posts", {
                caption: captionSnap,
                visibility: visibilitySnap,
                media
            })

            // 4️⃣  Success
            setJob({ status: "success", progress: 100 })
            setTimeout(() => setJob(null), 4000) // auto-dismiss after 4s

        } catch (err: any) {
            const msg = err?.response?.data?.message || "Upload failed"
            setJob({ status: "error", message: msg })
            toast.error(msg)
        }
    }

    if (!mounted) return null

    return (
        <div className="bg-[#F0F0EB] dark:bg-[#0A0A0A] text-black dark:text-white pb-10 font-mono selection:bg-red-500/30">
            <style>{`
                .ndot-grid {
                    background-image: radial-gradient(circle, rgba(0,0,0,0.11) 1px, transparent 1px);
                    background-size: 18px 18px;
                }
                @media (prefers-color-scheme: dark) {
                    .ndot-grid { background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px); }
                }
                .n-shimmer { position: relative; overflow: hidden; }
                .n-shimmer::after {
                    content: '';
                    position: absolute; inset: 0;
                    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%);
                    transform: translateX(-100%);
                    transition: transform 0.55s ease;
                }
                .n-shimmer:hover::after { transform: translateX(100%); }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { scrollbar-width: none; }
            `}</style>

            <div className="ndot-grid absolute inset-0 pointer-events-none rounded-[32px]" />

            <div className="relative z-10 max-w-5xl mx-auto px-6 pt-8 space-y-10">

                {/* Header */}
                <header className="flex items-end justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-8">
                    <h1 className="text-[52px] md:text-[72px] font-black tracking-[-0.05em] uppercase leading-[0.82]">
                        New<br />
                        <span className="text-black/10 dark:text-white/[0.08]">Feed.</span>
                    </h1>
                    <div className="hidden md:flex flex-col items-end gap-2 self-end pb-1">
                        <span className="text-[9px] font-bold tracking-[0.4em] uppercase text-zinc-400">System_v3.0.4</span>
                        <span className="flex items-center gap-2 text-[9px] font-bold tracking-[0.4em] uppercase text-[#E8001A]">
                            <span className="w-[5px] h-[5px] rounded-full bg-[#E8001A] animate-pulse" />
                            Ready_To_Broadcast
                        </span>
                    </div>
                </header>

                {/* Body grid */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">

                    {/* LEFT — Viewfinder */}
                    <div className="space-y-4">
                        <div
                            onClick={() => !files.length && !submitting && fileInputRef.current?.click()}
                            className="relative aspect-square w-full rounded-[28px] overflow-hidden border border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-zinc-900 cursor-pointer group"
                        >
                            {files.length > 0 ? (
                                files[selectedIndex]?.type === "image"
                                    ? <img src={files[selectedIndex].preview} className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all duration-700" alt="Preview" />
                                    : <video src={files[selectedIndex]?.preview} className="w-full h-full object-cover" autoPlay muted loop />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                                    <div className="w-14 h-14 rounded-full border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center group-hover:border-[#E8001A] group-hover:scale-110 transition-all duration-300">
                                        <Plus size={24} className="text-zinc-300 dark:text-zinc-700 group-hover:text-[#E8001A] transition-colors duration-300" />
                                    </div>
                                    <span className="text-[9px] font-bold uppercase tracking-[0.5em] text-zinc-400">Initialize_Source</span>
                                </div>
                            )}
                            {["top-4 left-4 border-t-[1.5px] border-l-[1.5px]", "top-4 right-4 border-t-[1.5px] border-r-[1.5px]", "bottom-4 left-4 border-b-[1.5px] border-l-[1.5px]", "bottom-4 right-4 border-b-[1.5px] border-r-[1.5px]"].map((cls, i) => (
                                <div key={i} className={`absolute w-5 h-5 border-white/20 ${cls}`} />
                            ))}
                        </div>

                        {/* Filmstrip */}
                        {files.length > 0 && (
                            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                                {files.map((file, i) => (
                                    <div
                                        key={i}
                                        onClick={() => setSelectedIndex(i)}
                                        className={`relative shrink-0 w-[68px] h-[68px] rounded-[14px] overflow-hidden border-2 cursor-pointer transition-all duration-200
                                            ${selectedIndex === i ? "border-[#E8001A] opacity-100" : "border-transparent opacity-30 hover:opacity-70"}`}
                                    >
                                        <img src={file.preview} className="w-full h-full object-cover grayscale" alt="" />
                                        <button
                                            onClick={e => { e.stopPropagation(); removeFile(i) }}
                                            className="absolute inset-0 bg-[#E8001A]/80 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"
                                        >
                                            <X size={13} className="text-white" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="shrink-0 w-[68px] h-[68px] rounded-[14px] border border-dashed border-zinc-300 dark:border-zinc-800 flex items-center justify-center text-zinc-400 hover:border-[#E8001A] hover:text-[#E8001A] transition-all duration-200"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* RIGHT — Controls */}
                    <div className="bg-white dark:bg-[#111111] border border-black/[0.07] dark:border-white/[0.07] rounded-[28px] p-7 flex flex-col gap-7">

                        {/* Caption */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-[9px] font-bold uppercase tracking-[0.4em] text-zinc-400">Caption_Buffer</label>
                                <span className="text-[9px] text-zinc-400 tabular-nums">{caption.length}/500</span>
                            </div>
                            <textarea
                                value={caption}
                                onChange={e => setCaption(e.target.value)}
                                placeholder="// Describe the transmission..."
                                maxLength={500}
                                disabled={submitting}
                                className="w-full bg-transparent border-b border-black/[0.08] dark:border-white/[0.08] focus:border-[#E8001A] py-2 pb-4 text-[14px] leading-relaxed outline-none resize-none min-h-[110px] placeholder:text-zinc-300 dark:placeholder:text-zinc-700 transition-colors disabled:opacity-40"
                            />
                        </div>

                        <div className="h-px bg-black/[0.05] dark:bg-white/[0.05]" />

                        {/* Visibility */}
                        <div>
                            <label className="text-[9px] font-bold uppercase tracking-[0.4em] text-zinc-400 block mb-3">Access_Rights</label>
                            <div className="grid grid-cols-2 gap-2.5">
                                {[
                                    { id: "public",  label: "Public",  desc: "All nodes",  icon: Globe },
                                    { id: "private", label: "Private", desc: "Owner only", icon: Lock  }
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => !submitting && setVisibility(opt.id)}
                                        disabled={submitting}
                                        className={`flex flex-col items-start gap-3 p-4 rounded-[18px] border transition-all duration-200 text-left disabled:opacity-40
                                            ${visibility === opt.id
                                                ? "bg-black dark:bg-white text-white dark:text-black border-transparent"
                                                : "border-black/[0.07] dark:border-white/[0.07] text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600"
                                            }`}
                                    >
                                        <opt.icon size={14} />
                                        <div>
                                            <p className="text-[9px] font-bold uppercase tracking-[0.2em]">{opt.label}</p>
                                            <p className="text-[8px] opacity-40 mt-0.5">{opt.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="h-px bg-black/[0.05] dark:bg-white/[0.05]" />

                        {/* File dots */}
                        {files.length > 0 && (
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                    {files.map((_, i) => (
                                        <div
                                            key={i}
                                            onClick={() => setSelectedIndex(i)}
                                            className={`h-[3px] rounded-full transition-all duration-200 cursor-pointer
                                                ${selectedIndex === i ? "w-6 bg-[#E8001A]" : "w-3 bg-zinc-200 dark:bg-zinc-700"}`}
                                        />
                                    ))}
                                </div>
                                <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-zinc-400 ml-1">
                                    {files.length} file{files.length !== 1 ? "s" : ""}
                                </span>
                            </div>
                        )}

                        {/* CTA */}
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || !files.length}
                            className="n-shimmer w-full py-5 rounded-[18px] font-bold text-[9px] uppercase tracking-[0.45em] text-white flex items-center justify-center gap-3 transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed bg-[#E8001A] hover:bg-[#cc0017] disabled:opacity-20"
                        >
                            {submitting
                                ? <><Loader2 size={13} className="animate-spin" /> Launching...</>
                                : "Execute_Broadcast →"
                            }
                        </button>
                    </div>
                </div>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={e => e.target.files && addFiles(e.target.files)}
                multiple
                className="hidden"
                accept="image/*,video/*"
            />
        </div>
    )
}