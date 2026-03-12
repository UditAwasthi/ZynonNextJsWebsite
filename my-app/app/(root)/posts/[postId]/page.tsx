"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Share2, ExternalLink } from "lucide-react"
import PostPageInline from "../../../../src/components/post/PostPageInline"

/* ─── DOT GRID ─── */
const DotGrid = () => (
    <>
        <div
            className="absolute inset-0 pointer-events-none opacity-[0.035] dark:hidden"
            style={{
                backgroundImage: "radial-gradient(circle, rgba(0,0,0,1) 1px, transparent 1px)",
                backgroundSize: "14px 14px",
            }}
        />
        <div
            className="absolute inset-0 pointer-events-none opacity-[0.055] hidden dark:block"
            style={{
                backgroundImage: "radial-gradient(circle, rgba(255,255,255,1) 1px, transparent 1px)",
                backgroundSize: "14px 14px",
            }}
        />
    </>
)
// ✅ Fix — unwrap with use()
export default function PostPage({ params }: { params: Promise<{ postId: string }> }) {
    const { postId } = use(params)
    const router = useRouter()

    const handleShare = () => {
        if (typeof navigator === "undefined") return
        if (navigator.share) {
            navigator.share({ url: window.location.href })
        } else {
            navigator.clipboard.writeText(window.location.href)
        }
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-[#080808] font-mono">

            {/* ── Sticky Nav Bar ── */}
            <div className="sticky top-0 z-40 border-b border-zinc-200/80 dark:border-white/[0.06] bg-white/90 dark:bg-[#0D0D0D]/90 backdrop-blur-md">
                <div className="relative max-w-6xl mx-auto px-4 flex items-center justify-between h-12">
                    <DotGrid />

                    {/* Left — back */}
                    <button
                        onClick={() => router.back()}
                        className="relative z-10 flex items-center gap-2 group"
                    >
                        <ArrowLeft
                            size={13}
                            className="text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors group-hover:-translate-x-0.5 duration-200"
                        />
                        <span className="text-[9px] font-bold tracking-[0.25em] uppercase text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors">
                            Back
                        </span>
                    </button>

                    {/* Center — breadcrumb */}
                    <div className="relative z-10 flex items-center gap-2">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF0000] opacity-60"
                                style={{ animationDuration: "2s" }} />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#FF0000]" />
                        </span>
                        <span className="text-[8px] font-bold tracking-[0.3em] uppercase text-zinc-400 dark:text-zinc-500">
                            Node · Transmission
                        </span>
                        <div className="hidden sm:block h-px w-4 bg-zinc-200 dark:bg-zinc-800" />
                        <span className="hidden sm:block text-[8px] font-bold tracking-[0.15em] uppercase text-zinc-300 dark:text-zinc-700 max-w-[140px] truncate">
                            {postId}
                        </span>
                    </div>

                    {/* Right — actions */}
                    <div className="relative z-10 flex items-center gap-2">
                        <button
                            onClick={handleShare}
                            className="flex items-center gap-1.5 px-3 py-1.5
                                border border-zinc-200 dark:border-zinc-800
                                hover:border-black dark:hover:border-white
                                hover:bg-black dark:hover:bg-white
                                text-zinc-500 dark:text-zinc-400
                                hover:text-white dark:hover:text-black
                                transition-all duration-200"
                        >
                            <Share2 size={11} />
                            <span className="text-[8px] font-bold tracking-[0.2em] uppercase hidden sm:block">Share</span>
                        </button>
                        <a
                            href={`/posts/${postId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 flex items-center justify-center
                                border border-zinc-200 dark:border-zinc-800
                                hover:border-black dark:hover:border-white
                                hover:bg-black dark:hover:bg-white
                                text-zinc-500 dark:text-zinc-400
                                hover:text-white dark:hover:text-black
                                transition-all duration-200"
                        >
                            <ExternalLink size={11} />
                        </a>
                    </div>
                </div>
                <div className="absolute bottom-0 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-[#FF0000]/30 to-transparent" />
            </div>

            {/* ── Main Content ── */}
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="flex items-center gap-4 mb-6">
                    <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-900" />
                    <div className="grid grid-cols-3 gap-[3px] opacity-20">
                        {[...Array(9)].map((_, i) => (
                            <div key={i} className="w-[3px] h-[3px] rounded-full bg-black dark:bg-white" />
                        ))}
                    </div>
                    <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-900" />
                </div>

                <PostPageInline postId={postId} />

                <div className="flex items-center gap-4 mt-8">
                    <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-900" />
                    <span className="text-[7px] font-bold tracking-[0.3em] uppercase text-zinc-300 dark:text-zinc-700">Ver 3.0</span>
                    <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-900" />
                </div>
            </div>
        </div>
    )
}