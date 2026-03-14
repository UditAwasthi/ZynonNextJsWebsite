"use client"

import React, { useState, useRef, useCallback, useEffect } from 'react'
import toast from "react-hot-toast"
import { useRouter } from "next/navigation"
import api from "../../../src/lib/api/api"
import { Plus, X, Globe, Lock, Loader2, CheckCircle2 } from "lucide-react"
import { setUploadState } from "../../../src/components/create/UploadOverlay"

export default function CreatePage() {
    const router = useRouter()
    const [mounted, setMounted] = useState(false)
    const [files, setFiles] = useState<any[]>([])
    const [caption, setCaption] = useState("")
    const [visibility, setVisibility] = useState("public")
    const [loading, setLoading] = useState(false)
    const [isDone, setIsDone] = useState(false)
    const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({})
    const [selectedIndex, setSelectedIndex] = useState<number>(0)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const addFiles = useCallback((incoming: FileList) => {
        const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif", "heic", "heif", "bmp", "tiff", "tif", "svg"])
        const VIDEO_EXTS = new Set(["mp4", "mov", "m4v", "webm", "mkv", "avi", "wmv", "flv", "3gp", "ts", "mts", "m2ts"])

        const guessType = (f: File): "image" | "video" | null => {
            if (f.type.startsWith("image/")) return "image"
            if (f.type.startsWith("video/")) return "video"
            // f.type is empty on HEIC, MOV, MKV etc — fall back to extension
            const ext = f.name.split(".").pop()?.toLowerCase() ?? ""
            if (IMAGE_EXTS.has(ext)) return "image"
            if (VIDEO_EXTS.has(ext)) return "video"
            return null
        }

        const valid = Array.from(incoming).filter(f => {
            console.log("FILE:", f.name, "| type:", f.type, "| size:", f.size, "| guessType:", guessType(f))
            if (!guessType(f)) {
                toast.error(`${f.name.slice(0, 20)} — unsupported file type`)
                return false
            }
            if (f.size > 50 * 1024 * 1024) { toast.error(`${f.name.slice(0, 20)}... exceeds 50 MB`); return false }
            return true
        })
        const newEntries = valid.map(f => ({
            file: f,
            preview: URL.createObjectURL(f),
            type: guessType(f) as "image" | "video",
            ratio: null as number | null,
        }))
        setFiles(prev => [...prev, ...newEntries])

        newEntries.forEach((entry) => {
            if (entry.type === "image") {
                const img = new Image()
                img.onload = () => {
                    const ratio = img.naturalWidth / img.naturalHeight
                    console.log("IMG loaded:", entry.file.name, ratio, img.naturalWidth, "x", img.naturalHeight)
                    setFiles(prev => prev.map(f =>
                        f.preview === entry.preview ? { ...f, ratio } : f
                    ))
                }
                img.onerror = (e) => {
                    console.error("IMG failed to load:", entry.file.name, e)
                    // Still keep the file — just no ratio, will default to 1:1
                }
                img.src = entry.preview
            } else {
                const vid = document.createElement("video")
                vid.preload = "metadata"
                vid.onloadedmetadata = () => {
                    const ratio = vid.videoWidth / vid.videoHeight
                    console.log("VID loaded:", entry.file.name, ratio, vid.videoWidth, "x", vid.videoHeight)
                    setFiles(prev => prev.map(f =>
                        f.preview === entry.preview ? { ...f, ratio } : f
                    ))
                }
                vid.onerror = (e) => {
                    console.error("VID failed to load:", entry.file.name, e)
                }
                vid.src = entry.preview
            }
        })
    }, [])
    // Callback ref — fires the instant the <input> enters the DOM,
    // regardless of portal/mounted timing. Much more reliable than useEffect.
    const inputRefCallback = useCallback((el: HTMLInputElement | null) => {
        (fileInputRef as React.MutableRefObject<HTMLInputElement | null>).current = el
        if (!el) return
        const handler = () => {
            if (el.files && el.files.length > 0) {
                console.log("FILES SELECTED:", el.files.length)
                addFiles(el.files)
                el.value = ""
            }
        }
        el.removeEventListener("change", handler) // prevent double-attach
        el.addEventListener("change", handler)
    }, [addFiles])

    useEffect(() => { setMounted(true) }, [])



    const removeFile = useCallback((index: number) => {
        setFiles(prev => {
            URL.revokeObjectURL(prev[index].preview)
            const next = prev.filter((_, i) => i !== index)
            if (selectedIndex >= next.length) setSelectedIndex(Math.max(0, next.length - 1))
            return next
        })
    }, [selectedIndex])

    const uploadToCloudinary = async (file: File, index: number, total: number) => {
        const sigRes = await api.get("content/media/signature")
        const sig = sigRes.data
        const formData = new FormData()
        formData.append("file", file)
        formData.append("api_key", sig.apiKey)
        formData.append("timestamp", sig.timestamp)
        formData.append("signature", sig.signature)
        formData.append("folder", "zynon/posts")

        return new Promise<any>((resolve, reject) => {
            const xhr = new XMLHttpRequest()
            xhr.upload.addEventListener("progress", (e) => {
                if (!e.lengthComputable) return
                const filePct = Math.round((e.loaded * 100) / e.total)
                setUploadProgress(prev => {
                    const updated = { ...prev, [index]: filePct }
                    const overall = Math.round(
                        Object.values(updated).reduce((a, b) => a + b, 0) / total
                    )
                    setUploadState({ progress: overall })
                    return updated
                })
            })
            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    const data = JSON.parse(xhr.responseText)
                    xhr.status === 200 ? resolve(data) : reject(data)
                }
            }
            xhr.open("POST", `https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`)
            xhr.send(formData)
        })
    }

    const handleSubmit = async () => {
        if (!files.length || loading) return
        setLoading(true)

        setUploadState({
            visible: true,
            status: "uploading",
            progress: 0,
            fileCount: files.length,
            message: ""
        })

        try {
            const results = await Promise.all(
                files.map((f, i) => uploadToCloudinary(f.file, i, files.length))
            )

            const media = results.map(r => ({
                url: r.secure_url,
                publicId: r.public_id,
                width: r.width,
                height: r.height,
                ...(r.duration && { duration: r.duration }),
                type: r.resource_type === "video" ? "video" : "image"
            }))

            await api.post("content/posts", { caption, visibility, media })

            setIsDone(true)
            setLoading(false)
            setUploadState({ status: "success", progress: 100 })

            setTimeout(() => {
                setUploadState({ visible: false })
                router.push("/profile")
            }, 1800)

        } catch (err: any) {
            setLoading(false)
            setUploadState({
                status: "error",
                message: err.response?.data?.message || "Upload_Failed"
            })
            toast.error(err.response?.data?.message || "Upload failed")
        }
    }

    if (!mounted) return null

    const overallProgress = files.length
        ? Math.round(Object.values(uploadProgress).reduce((a, b) => a + b, 0) / files.length)
        : 0

    return (
        <div className="min-h-screen bg-[#F0F0EB] dark:bg-[#0A0A0A] text-black dark:text-white pb-32 font-mono selection:bg-red-500/30">
            <style>{`
                .ndot-grid {
                    background-image: radial-gradient(circle, rgba(0,0,0,0.11) 1px, transparent 1px);
                    background-size: 18px 18px;
                }
                @media (prefers-color-scheme: dark) {
                    .ndot-grid {
                        background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px);
                    }
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

            <div className="ndot-grid fixed inset-0 pointer-events-none z-0" />

            <div className="relative z-10 max-w-6xl mx-auto px-6 pt-10 space-y-12">

                {/* ── HEADER ── */}
                <header className="flex items-end justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-10">
                    <div className="space-y-4">
                        <button
                            onClick={() => router.back()}
                            className="group flex items-center gap-3 text-[9px] font-bold uppercase tracking-[0.45em] text-zinc-400 hover:text-[#E8001A] transition-colors"
                        >
                            <span className="block w-5 h-px bg-current group-hover:w-8 transition-all duration-200" />
                            Abort_Stream
                        </button>
                        <h1 className="text-[68px] md:text-[92px] font-black tracking-[-0.05em] uppercase leading-[0.82]">
                            New<br />
                            <span className="text-black/10 dark:text-white/[0.08]">Feed.</span>
                        </h1>
                    </div>
                    <div className="hidden md:flex flex-col items-end gap-2 self-end pb-1">
                        <span className="text-[9px] font-bold tracking-[0.4em] uppercase text-zinc-400">System_v3.0.4</span>
                        <span className="flex items-center gap-2 text-[9px] font-bold tracking-[0.4em] uppercase text-[#E8001A]">
                            <span className="w-[5px] h-[5px] rounded-full bg-[#E8001A] animate-pulse" />
                            Ready_To_Broadcast
                        </span>
                    </div>
                </header>

                {/* ── BODY GRID ── */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">

                    {/* LEFT — Viewfinder */}
                    <div className="space-y-4">
                        <div
                            onClick={() => !files.length && !loading && fileInputRef.current?.click()}
                            className="relative w-full rounded-[28px] overflow-hidden border border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-zinc-900 cursor-pointer group"
                            style={{
                                aspectRatio: files[selectedIndex]?.ratio
                                    ? `${files[selectedIndex].ratio}`
                                    : "1 / 1",
                                minHeight: 260,
                                maxHeight: 680,
                                maxWidth: "100%",
                            }}
                        >
                            {files.length > 0 ? (
                                <>
                                    {files[selectedIndex]?.type === "image" ? (
                                        <img
                                            src={files[selectedIndex].preview}
                                            className="w-full h-full object-contain grayscale-[30%] group-hover:grayscale-0 transition-all duration-700"
                                            alt="Preview"
                                        />
                                    ) : (
                                        <video src={files[selectedIndex]?.preview} className="w-full h-full object-contain" autoPlay muted loop />
                                    )}

                                    {loading && (
                                        <div className="absolute inset-0 bg-black/65 backdrop-blur-[3px] flex flex-col items-center justify-center gap-4">
                                            <span className="text-[64px] font-black tracking-[-0.05em] text-white leading-none tabular-nums">
                                                {overallProgress}%
                                            </span>
                                            <div className="w-36 h-[2px] bg-white/20 rounded-full overflow-hidden">
                                                <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width: `${overallProgress}%` }} />
                                            </div>
                                            <span className="text-[8px] font-bold tracking-[0.5em] uppercase text-white/40">
                                                Buffering_Uplink
                                            </span>
                                        </div>
                                    )}

                                    {isDone && (
                                        <div className="absolute inset-0 bg-emerald-500/90 backdrop-blur-[3px] flex flex-col items-center justify-center gap-4"
                                            style={{ animation: "fadeIn 0.3s ease both" }}
                                        >
                                            <style>{`@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }`}</style>
                                            <CheckCircle2 size={52} className="text-white" strokeWidth={1.5} />
                                            <div className="text-center space-y-1">
                                                <p className="text-[11px] font-bold tracking-[0.5em] uppercase text-white">Post_Synchronized</p>
                                                <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-white/50">Redirecting...</p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                                    <div className="w-14 h-14 rounded-full border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center group-hover:border-[#E8001A] group-hover:scale-110 transition-all duration-300">
                                        <Plus size={24} className="text-zinc-300 dark:text-zinc-700 group-hover:text-[#E8001A] transition-colors duration-300" />
                                    </div>
                                    <span className="text-[9px] font-bold uppercase tracking-[0.5em] text-zinc-400">
                                        Initialize_Source
                                    </span>
                                </div>
                            )}

                            {[
                                "top-4 left-4 border-t-[1.5px] border-l-[1.5px]",
                                "top-4 right-4 border-t-[1.5px] border-r-[1.5px]",
                                "bottom-4 left-4 border-b-[1.5px] border-l-[1.5px]",
                                "bottom-4 right-4 border-b-[1.5px] border-r-[1.5px]"
                            ].map((cls, i) => (
                                <div key={i} className={`absolute w-5 h-5 border-white/20 ${cls}`} />
                            ))}
                        </div>

                        {files.length > 0 && !loading && !isDone && (
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
                                disabled={loading || isDone}
                                className="w-full bg-transparent border-b border-black/[0.08] dark:border-white/[0.08] focus:border-[#E8001A] py-2 pb-4 text-[14px] leading-relaxed outline-none resize-none min-h-[110px] placeholder:text-zinc-300 dark:placeholder:text-zinc-700 transition-colors disabled:opacity-40"
                            />
                        </div>

                        <div className="h-px bg-black/[0.05] dark:bg-white/[0.05]" />

                        <div>
                            <label className="text-[9px] font-bold uppercase tracking-[0.4em] text-zinc-400 block mb-3">Access_Rights</label>
                            <div className="grid grid-cols-2 gap-2.5">
                                {[
                                    { id: "public", label: "Public", desc: "All nodes", icon: Globe },
                                    { id: "private", label: "Private", desc: "Owner only", icon: Lock }
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => !(loading || isDone) && setVisibility(opt.id)}
                                        disabled={loading || isDone}
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

                        {files.length > 0 && (
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                    {files.map((_, i) => (
                                        <div
                                            key={i}
                                            onClick={() => !(loading || isDone) && setSelectedIndex(i)}
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

                        <button
                            onClick={handleSubmit}
                            disabled={loading || !files.length || isDone}
                            className={`n-shimmer w-full py-5 rounded-[18px] font-bold text-[9px] uppercase tracking-[0.45em] text-white flex items-center justify-center gap-3 transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed
                                ${isDone
                                    ? "bg-emerald-500 opacity-100"
                                    : "bg-[#E8001A] hover:bg-[#cc0017] disabled:opacity-20"
                                }`}
                        >
                            {isDone ? (
                                <><CheckCircle2 size={13} /> Post_Synchronized</>
                            ) : loading ? (
                                <><Loader2 size={13} className="animate-spin" /> {overallProgress > 0 ? `${overallProgress}%` : "Uploading..."}</>
                            ) : (
                                "Execute_Broadcast →"
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <input
                type="file"
                ref={inputRefCallback}
                multiple
                className="hidden"
            />
        </div>
    )
}