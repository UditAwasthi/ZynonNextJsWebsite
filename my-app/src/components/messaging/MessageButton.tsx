"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Loader2 } from "lucide-react";
import { createOrGetDMThread } from "../../lib/api/chatApi";

interface MessageButtonProps {
    userId: string;
    label?: string;
    className?: string;
    /** compact = icon-only pill, useful inside tight layouts */
    compact?: boolean;
}

type State = "idle" | "loading" | "error";

export const DM_HANDOFF_KEY = "zynon:pending_dm_thread";

export default function MessageButton({
    userId, label = "Message", className, compact = false
}: MessageButtonProps) {
    const router = useRouter();
    const [state, setState] = useState<State>("idle");

    const handleMessage = async () => {
        if (state === "loading") return;
        setState("loading");
        try {
            const res = await createOrGetDMThread(userId);
            const thread = res.data?.data;
            // Backend returns threadId (fixed shape) but may still return _id — handle both
            const id = thread?.threadId ?? thread?._id;
            if (!id) throw new Error("No thread id returned");
            sessionStorage.setItem(DM_HANDOFF_KEY, id);
            router.push("/messages");
        } catch (err) {
            console.error("[MessageButton] Failed to create thread:", err);
            setState("error");
            setTimeout(() => setState("idle"), 2500);
        }
    };

    const isError   = state === "error";
    const isLoading = state === "loading";

    if (compact) {
        return (
            <button
                onClick={handleMessage}
                disabled={isLoading}
                aria-label="Send message"
                title={label}
                className={[
                    "relative inline-flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 select-none active:scale-90",
                    !isError
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                        : "bg-red-100 dark:bg-red-950 text-red-500 cursor-not-allowed",
                    isLoading ? "opacity-70 cursor-wait" : "",
                    className ?? "",
                ].filter(Boolean).join(" ")}
            >
                {isLoading
                    ? <Loader2 size={15} className="animate-spin" />
                    : <MessageSquare size={15} strokeWidth={2} />
                }
                {isLoading && (
                    <span className="absolute inset-0 rounded-full animate-ping bg-black/10 dark:bg-white/10 pointer-events-none" />
                )}
            </button>
        );
    }

    return (
        <button
            onClick={handleMessage}
            disabled={isLoading}
            aria-label="Send message to this user"
            className={[
                "relative inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] rounded-full transition-all duration-200 select-none",
                !isError
                    ? "bg-black text-white dark:bg-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-[0.97]"
                    : "bg-red-500 text-white cursor-not-allowed",
                isLoading ? "opacity-70 cursor-wait" : "",
                className ?? "",
            ].filter(Boolean).join(" ")}
        >
            {isLoading
                ? <Loader2 size={13} className="animate-spin shrink-0" />
                : <MessageSquare size={13} className="shrink-0" />
            }
            <span className="hidden xs:inline sm:inline">
                {isLoading ? "Opening…" : isError ? "Try again" : label}
            </span>
            <span className="xs:hidden sm:hidden">
                {isLoading ? "…" : isError ? "!" : label}
            </span>
            {isLoading && (
                <span className="absolute inset-0 rounded-full animate-ping bg-black/10 dark:bg-white/10 pointer-events-none" />
            )}
        </button>
    );
}