"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MessageSquare, Loader2 } from "lucide-react"
import { createOrGetDMThread } from "../../lib/api/chatApi"

interface MessageButtonProps {
    userId: string
    label?: string
    className?: string
}

type State = "idle" | "loading" | "error"

export const DM_HANDOFF_KEY = "zynon:pending_dm_thread"

export default function MessageButton({ userId, label = "Message", className }: MessageButtonProps) {
    const router = useRouter()
    const [state, setState] = useState<State>("idle")

    const handleMessage = async () => {
        if (state === "loading") return
        setState("loading")

        try {
            const res = await createOrGetDMThread(userId)
            const thread = res.data?.data

            if (!thread?._id) throw new Error("No thread returned")

            // Hand off thread _id via sessionStorage — page.tsx reads & clears it on mount
            sessionStorage.setItem(DM_HANDOFF_KEY, thread._id)
            router.push("/messages")
        } catch (err) {
            console.error("[MessageButton] Failed to create thread:", err)
            setState("error")
            setTimeout(() => setState("idle"), 2500)
        }
    }

    return (
        <button
            onClick={handleMessage}
            disabled={state === "loading"}
            aria-label="Send message to this user"
            className={[
                "relative inline-flex items-center gap-2 px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] rounded-full transition-all duration-200 select-none",
                state !== "error"
                    ? "bg-black text-white dark:bg-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-[0.97]"
                    : "bg-red-500 text-white cursor-not-allowed",
                state === "loading" ? "opacity-70 cursor-wait" : "",
                className ?? "",
            ].filter(Boolean).join(" ")}
        >
            {state === "loading"
                ? <Loader2 size={13} className="animate-spin shrink-0" />
                : <MessageSquare size={13} className="shrink-0" />
            }
            <span>
                {state === "loading" ? "Opening..." : state === "error" ? "Try again" : label}
            </span>
            {state === "loading" && (
                <span className="absolute inset-0 rounded-full animate-ping bg-black/10 dark:bg-white/10 pointer-events-none" />
            )}
        </button>
    )
}