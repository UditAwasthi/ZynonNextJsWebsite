"use client"

/**
 * PostPageInline.tsx
 *
 * Renders the PostModal card directly on the page (no fixed overlay / backdrop).
 * It patches the DOM after mount to extract the card from the overlay wrapper,
 * OR — far simpler — we just pass `inline` through a React context so PostModal
 * can skip its backdrop shell.
 *
 * Strategy used here: CSS override approach.
 * We render PostModal inside a positioned container and override the `fixed`
 * overlay to be `relative` instead, so the card flows naturally in the page.
 */

import { useRouter } from "next/navigation"
import PostModal from "../profile/PostModal"

interface PostPageInlineProps {
    postId: string
}

export default function PostPageInline({ postId }: PostPageInlineProps) {
    const router = useRouter()

    return (
        <>
            {/* Override PostModal's fixed overlay → relative, so it flows in page */}
            <style>{`
                .pm-inline-host > div:first-child {
                    position: relative !important;
                    inset: unset !important;
                    z-index: 1 !important;
                    background: transparent !important;
                    backdrop-filter: none !important;
                    -webkit-backdrop-filter: none !important;
                    animation: none !important;
                    display: block !important;
                    padding: 0 !important;
                    width: 100% !important;
                    height: auto !important;
                }
                /* Loading spinner overlay override */
                .pm-inline-host > div.fixed {
                    position: relative !important;
                    inset: unset !important;
                    z-index: 1 !important;
                    background: transparent !important;
                    backdrop-filter: none !important;
                    -webkit-backdrop-filter: none !important;
                    animation: none !important;
                    min-height: 400px;
                }
                /* The inner card — make it full width, auto height on page */
                .pm-inline-host .w-full.flex.flex-col.md\\:flex-row {
                    max-width: 100% !important;
                    width: 100% !important;
                    height: min(85vh, 740px) !important;
                    border-radius: 20px !important;
                    animation: none !important;
                    box-shadow: 0 8px 48px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.07) !important;
                }
                @media (prefers-color-scheme: dark) {
                    .pm-inline-host .w-full.flex.flex-col.md\\:flex-row {
                        box-shadow: 0 8px 48px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.07) !important;
                    }
                }
            `}</style>

            <div className="pm-inline-host w-full">
                <PostModal
                    postId={postId}
                    onClose={() => router.back()}
                    onDelete={() => router.back()}
                />
            </div>
        </>
    )
}