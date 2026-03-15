"use client";

import { useState, useEffect, useRef } from "react";
import { UserCircle2, Play, Images, Loader2 } from "lucide-react";
import { createPortal } from "react-dom";
import { getSinglePost } from "../../lib/api/postApi";
import PostModal from "../profile/PostModal";

interface PostRef {
    _id: string;
    caption?: string;
    media?: { url: string; type: string }[];
    author?: {
        _id: string;
        username: string;
        profilePicture?: string;
    };
}

const _postCache = new Map<string, PostRef>();

interface Props {
    post: PostRef;
    isMine: boolean;
}

export default function PostMessageCard({ post: initialPost, isMine }: Props) {
    const [post, setPost] = useState<PostRef>(
        () => _postCache.get(initialPost._id) ?? initialPost
    );
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const needsFetch = !post.author?.username || !post.media?.length;

    useEffect(() => {
        if (!needsFetch) return;
        if (_postCache.has(post._id)) {
            setPost(_postCache.get(post._id)!);
            return;
        }
        setLoading(true);
        getSinglePost(post._id)
            .then(res => {
                const p = res.data?.data;
                if (!p) return;
                const enriched: PostRef = {
                    _id: p.postId ?? post._id,
                    caption: p.caption,
                    media: p.media,
                    author: {
                        _id: p.author?._id ?? "",
                        username: p.author?.username ?? "Unknown",
                        profilePicture: p.profile?.profilePicture,
                    },
                };
                _postCache.set(post._id, enriched);
                setPost(enriched);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [post._id, needsFetch]);

    const firstMedia = post.media?.[0];
    const isVideo = firstMedia?.type === "video";
    const isMulti = (post.media?.length ?? 0) > 1;
    const hasMedia = !!firstMedia;

    const openModal = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setShowModal(true);
    };

    const closeModal = (e?: React.MouseEvent) => {
        e?.preventDefault();
        e?.stopPropagation();
        setShowModal(false);
    };

    return (
        <>
            <button
                onClick={openModal}
                className={`
                    group w-[240px] rounded-xl overflow-hidden text-left
                    transition-all duration-200 active:scale-[0.98]
                    /* Android 17 Palette: Dark Navy & Forest Green */
                    ${isMine
                        ? "bg-[#1a2b3c] dark:bg-[#0f1a24] ring-2 ring-orange-500 shadow-[4px_4px_0px_0px_rgba(249,115,22,0.3)]"
                        : "bg-white dark:bg-zinc-900 ring-2 ring-[#2d4a3e] shadow-[4px_4px_0px_0px_rgba(45,74,62,0.2)]"
                    }
                `}
            >
                {/* Author header - Forest Green accent */}
                <div className={`flex items-center gap-2.5 px-3 py-2.5 ${isMine ? "bg-[#243b55] border-b border-orange-500/30" : "bg-[#2d4a3e] border-b border-black/10"
                    }`}>
                    <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 ring-2 ring-white/20 bg-zinc-800 flex items-center justify-center">
                        {post.author?.profilePicture ? (
                            <img src={post.author.profilePicture} alt={post.author.username} className="w-full h-full object-cover" />
                        ) : (
                            <UserCircle2 size={18} className="text-white/70" />
                        )}
                    </div>
                    <span className="text-[13px] font-bold tracking-wide truncate flex-1 leading-none text-white uppercase">
                        {loading && !post.author?.username
                            ? <span className="inline-block w-20 h-3 rounded animate-pulse bg-white/20" />
                            : (post.author?.username ?? "RANGER_17")
                        }
                    </span>
                    {/* Tiny "RR" or Scout icon style detail */}
                    <div className={`w-2 h-2 rounded-full ${isMine ? "bg-orange-500" : "bg-green-400"}`} />
                </div>

                {/* Media Section */}
                {loading && !hasMedia ? (
                    <div className="w-full aspect-square animate-pulse bg-zinc-800" />
                ) : hasMedia ? (
                    <div className="relative w-full aspect-square bg-black overflow-hidden group-hover:opacity-90 transition-opacity">
                        {isVideo ? (
                            <>
                                <video src={firstMedia.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-orange-500/90 flex items-center justify-center shadow-lg">
                                        <Play size={20} fill="white" className="text-white translate-x-0.5" />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <img src={firstMedia.url} alt={post.caption ?? "Post"} className="w-full h-full object-cover" loading="lazy" />
                        )}
                        {/* Multi-image indicator styled like a digital scout HUD */}
                        {isMulti && (
                            <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-orange-600 px-2 py-0.5 rounded-sm">
                                <Images size={10} className="text-white" />
                                <span className="text-white text-[10px] font-black">{post.media!.length}</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className={`w-full aspect-square flex items-center justify-center px-6 ${isMine ? "bg-[#1a2b3c]" : "bg-[#f3f4f6] dark:bg-zinc-800"}`}>
                        <p className={`text-[14px] font-bold italic text-center line-clamp-4 leading-tight ${isMine ? "text-orange-400" : "text-[#2d4a3e] dark:text-green-500"}`}>
                            "{post.caption || "NO DATA"}"
                        </p>
                    </div>
                )}

                {/* Caption - Stark contrast text */}
                {post.caption && hasMedia && (
                    <div className="px-3 py-3 bg-white dark:bg-zinc-900">
                        <p className="text-[12px] font-medium leading-snug line-clamp-2 text-zinc-700 dark:text-zinc-300">
                            <span className="text-orange-600 dark:text-orange-500 font-bold mr-1">#</span>
                            {post.caption}
                        </p>
                    </div>
                )}

                {/* Tap hint - Tactical Button Style */}
                <div className={`px-3 py-2 text-[10px] font-black uppercase tracking-tighter text-center border-t-2 ${isMine
                        ? "bg-orange-500 text-white border-orange-600"
                        : "bg-[#2d4a3e] text-white border-[#1e332a]"
                    }`}>
                    Initialize Field Report
                </div>
            </button>

            {/* Modal Portal */}
            {showModal && mounted && createPortal(
                <div
                    style={{ position: "fixed", inset: 0, zIndex: 9999 }}
                    className="backdrop-blur-md bg-black/60 flex items-center justify-center p-4"
                >
                    <div className="ring-4 ring-orange-500 rounded-2xl overflow-hidden shadow-2xl">
                        <PostModal
                            postId={post._id}
                            onClose={() => setShowModal(false)}
                        />
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}