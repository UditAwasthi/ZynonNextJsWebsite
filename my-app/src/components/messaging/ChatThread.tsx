"use client";
import { useState, useRef, useEffect, useCallback, memo } from "react";
import { Phone, Video, MoreHorizontal, ChevronLeft, ArrowUp, Loader2, Paperclip, X, FileIcon, Play, Pause, Volume2, VolumeX, Maximize2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getMessages, sendMessage, markMessagesSeen, addReaction, uploadChatMedia } from "../../lib/api/chatApi";
import { getSocket } from "../../lib/socket";
import api from "../../lib/api/api";

// ── Profile picture cache (shared with InboxList) ────────────────────────────
const profilePicCache = new Map<string, string | null>();
async function fetchProfilePic(username: string): Promise<string | null> {
    if (profilePicCache.has(username)) return profilePicCache.get(username) ?? null;
    try {
        const { data } = await api.get(`/profile/${username}`);
        const pic =
            data?.data?.profilePicture ??
            data?.data?.profile?.profilePicture ??
            data?.profilePicture ??
            null;
        profilePicCache.set(username, pic);
        return pic;
    } catch {
        profilePicCache.set(username, null);
        return null;
    }
}

interface Message {
    _id: string;
    threadId: string;
    senderId: { _id: string; username: string };
    content: string;
    createdAt: string;
    seenBy: string[];
    deliveredTo: string[];
    reactions: { userId: string; emoji: string }[];
    mediaUrl?: string;
    mediaType?: "image" | "video" | "audio" | "file";
    mediaMeta?: { width?: number; height?: number; duration?: number; size?: number };
    type?: "text" | "media";
    // client-only fields
    _failed?: boolean;
    _uploadProgress?: number;
}

interface MediaAttachment {
    file: File;
    previewUrl: string;
    mediaType: "image" | "video" | "audio" | "file";
}

interface Thread {
    threadId: string;
    user: { _id: string; username: string; profilePicture?: string } | null;
}

interface Props {
    thread: Thread;
    onBack: () => void;
    currentUserId: string;
    token: string;
}

const EMOJI_OPTIONS = ["❤️", "😂", "🔥", "👏", "😮", "😢"];

const getAvatarColor = (username: string) => {
    const colors = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#ef4444"];
    let hash = 0;
    for (let i = 0; i < username.length; i++) hash += username.charCodeAt(i);
    return colors[hash % colors.length];
};

const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// ── Image Lightbox ───────────────────────────────────────────────────────────
function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            style={{ animation: "fadeIn 0.15s ease" }}
            onClick={onClose}
        >
            <button
                onClick={onClose}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
                <X size={18} />
            </button>
            <img
                src={url}
                alt="Full size"
                className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
                style={{ animation: "zoomIn 0.2s cubic-bezier(0.34,1.56,0.64,1)" }}
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
}

// ── Custom Audio Player ───────────────────────────────────────────────────────
function AudioPlayer({ src, isMine, radius, isUploading, uploadProgress }: {
    src: string;
    isMine: boolean;
    radius: string;
    isUploading: boolean;
    uploadProgress?: number;
}) {
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (playing) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setPlaying(!playing);
    };

    const handleTimeUpdate = () => {
        if (!audioRef.current) return;
        const ct = audioRef.current.currentTime;
        const dur = audioRef.current.duration || 0;
        setCurrentTime(ct);
        setProgress(dur ? (ct / dur) * 100 : 0);
    };

    const handleEnded = () => setPlaying(false);

    const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!audioRef.current || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        audioRef.current.currentTime = pct * duration;
    };

    const fmt = (s: number) => {
        if (!s || isNaN(s)) return "0:00";
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, "0")}`;
    };

    const fg = isMine ? "bg-white" : "bg-black dark:bg-white";
    const fgMuted = isMine ? "bg-white/30" : "bg-zinc-300 dark:bg-zinc-600";
    const textColor = isMine ? "text-white dark:text-black" : "text-black dark:text-white";
    const textMuted = isMine ? "text-white/50 dark:text-black/50" : "text-zinc-400";
    const bg = isMine ? "bg-black dark:bg-white" : "bg-zinc-100 dark:bg-zinc-800";

    return (
        <div
            className={`px-3.5 py-2.5 ${bg} flex items-center gap-3 min-w-[220px]`}
            style={{ borderRadius: radius }}
        >
            <audio
                ref={audioRef}
                src={src}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
                onEnded={handleEnded}
            />

            {isUploading ? (
                <div className="flex items-center gap-2 w-full">
                    <Loader2 size={16} className={`animate-spin shrink-0 ${textMuted}`} />
                    <div className={`flex-1 h-1 rounded-full ${fgMuted}`}>
                        <div className={`h-full rounded-full transition-all duration-200 ${fg}`} style={{ width: `${uploadProgress ?? 0}%` }} />
                    </div>
                    <span className={`text-[10px] shrink-0 ${textMuted}`}>{uploadProgress}%</span>
                </div>
            ) : (
                <>
                    {/* Play/pause */}
                    <button
                        onClick={togglePlay}
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 ${
                            isMine ? "bg-white/20 hover:bg-white/30" : "bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20"
                        }`}
                    >
                        {playing
                            ? <Pause size={14} className={textColor} fill="currentColor" />
                            : <Play size={14} className={textColor} fill="currentColor" style={{ marginLeft: 1 }} />
                        }
                    </button>

                    {/* Waveform-style scrub bar */}
                    <div className="flex flex-col gap-1 flex-1">
                        <div
                            className={`h-1.5 rounded-full ${fgMuted} cursor-pointer relative overflow-hidden`}
                            onClick={handleScrub}
                        >
                            <div
                                className={`absolute left-0 top-0 h-full rounded-full transition-all duration-100 ${fg}`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className={`flex justify-between text-[9px] font-mono ${textMuted}`}>
                            <span>{fmt(currentTime)}</span>
                            <span>{fmt(duration)}</span>
                        </div>
                    </div>

                    <Volume2 size={13} className={`shrink-0 ${textMuted}`} />
                </>
            )}
        </div>
    );
}

// ── Video Lightbox ───────────────────────────────────────────────────────────
function VideoLightbox({ url, onClose }: { url: string; onClose: () => void }) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[999] bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
            style={{ animation: "fadeIn 0.15s ease" }}
            onClick={onClose}
        >
            <button
                onClick={onClose}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
            >
                <X size={18} />
            </button>
            <video
                src={url}
                controls
                autoPlay
                className="max-w-full max-h-[90vh] rounded-xl shadow-2xl"
                style={{ animation: "zoomIn 0.2s cubic-bezier(0.34,1.56,0.64,1)" }}
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
}

// ── Video Player (bubble) ─────────────────────────────────────────────────────
const VideoPlayer = memo(function VideoPlayer({ src, radius, isUploading, uploadProgress, onExpand }: {
    src: string;
    radius: string;
    isUploading: boolean;
    uploadProgress?: number;
    onExpand: () => void;
}) {
    // All playback state is kept LOCAL — never triggers parent re-render
    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    // DOM refs for progress bar and time — updated via RAF, not setState
    const progressBarRef = useRef<HTMLDivElement>(null);
    const timeRef = useRef<HTMLSpanElement>(null);
    const rafRef = useRef<number>(0);

    const fmt = (s: number) => {
        if (!s || isNaN(s)) return "0:00";
        return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
    };

    // RAF loop — updates DOM directly, zero React re-renders during playback
    const startRaf = () => {
        const tick = () => {
            const v = videoRef.current;
            if (!v) return;
            const pct = v.duration ? (v.currentTime / v.duration) * 100 : 0;
            if (progressBarRef.current) progressBarRef.current.style.width = `${pct}%`;
            if (timeRef.current) timeRef.current.textContent = `${fmt(v.currentTime)}/${fmt(v.duration)}`;
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
    };

    const stopRaf = () => cancelAnimationFrame(rafRef.current);

    useEffect(() => () => stopRaf(), []);

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        const v = videoRef.current;
        if (!v) return;
        if (playing) { v.pause(); stopRaf(); setPlaying(false); }
        else { v.play(); startRaf(); setPlaying(true); }
    };

    const handleEnded = () => { stopRaf(); setPlaying(false); };

    const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        const v = videoRef.current;
        if (!v || !v.duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        v.currentTime = ((e.clientX - rect.left) / rect.width) * v.duration;
    };

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        const v = videoRef.current;
        if (!v) return;
        v.muted = !muted;
        setMuted(!muted);
    };

    return (
        <div
            className="relative overflow-hidden bg-black cursor-pointer"
            style={{ borderRadius: radius, width: 260 }}
            onClick={onExpand}
        >
            <video
                ref={videoRef}
                src={src}
                className="w-full max-h-[300px] object-cover block"
                style={{ borderRadius: radius }}
                onEnded={handleEnded}
                muted={muted}
                playsInline
                preload="metadata"
            />

            {/* Upload overlay */}
            {isUploading && (
                <>
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center" style={{ borderRadius: radius }}>
                        <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
                            <Loader2 size={18} className="animate-spin text-white" />
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                        <div className="h-full bg-white transition-all duration-200 ease-out" style={{ width: `${uploadProgress ?? 0}%` }} />
                    </div>
                </>
            )}

            {/* Controls */}
            {!isUploading && (
                <div
                    className="absolute inset-0 flex flex-col justify-end"
                    style={{ borderRadius: radius, background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 50%)" }}
                >
                    <div className="px-3 pb-2.5 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={togglePlay}
                            className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors shrink-0 backdrop-blur-sm"
                        >
                            {playing
                                ? <Pause size={12} className="text-white" fill="white" />
                                : <Play size={12} className="text-white" fill="white" style={{ marginLeft: 1 }} />
                            }
                        </button>

                        {/* Progress bar — width driven by RAF ref, not state */}
                        <div
                            className="flex-1 h-1.5 rounded-full bg-white/30 cursor-pointer relative overflow-hidden"
                            onClick={handleScrub}
                        >
                            <div
                                ref={progressBarRef}
                                className="absolute left-0 top-0 h-full rounded-full bg-white"
                                style={{ width: "0%" }}
                            />
                        </div>

                        {/* Time — updated by RAF ref */}
                        <span ref={timeRef} className="text-[9px] font-mono text-white/70 shrink-0 tabular-nums">0:00/0:00</span>

                        <button onClick={toggleMute} className="text-white/70 hover:text-white transition-colors shrink-0">
                            {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                        </button>

                        <button
                            onClick={(e) => { e.stopPropagation(); onExpand(); }}
                            className="text-white/70 hover:text-white transition-colors shrink-0"
                        >
                            <Maximize2 size={12} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

export default function ChatThread({ thread, onBack, currentUserId, token }: Props) {
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [profilePic, setProfilePic] = useState<string | null>(thread.user?.profilePicture ?? null);
    const [inputValue, setInputValue] = useState("");
    const [loading, setLoading] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const [cursor, setCursor] = useState<string | undefined>();
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hoveredMsg, setHoveredMsg] = useState<string | null>(null);
    const [newMsgIds, setNewMsgIds] = useState<Set<string>>(new Set());
    const [attachment, setAttachment] = useState<MediaAttachment | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const [videoLightboxUrl, setVideoLightboxUrl] = useState<string | null>(null);
    const openVideoLightbox = useCallback((url: string) => setVideoLightboxUrl(url), []);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const ownedMessageIds = useRef<Set<string>>(new Set());
    const username = thread.user?.username || "Unknown";

    // ── Fetch profile picture (cached) ────────────────────────────────────────
    useEffect(() => {
        if (!thread.user?.username) return;
        fetchProfilePic(thread.user.username).then(pic => {
            if (pic) setProfilePic(pic);
        });
    }, [thread.user?.username]);

    // ── Load initial messages ─────────────────────────────────────────────────
    useEffect(() => {
        const fetchMessages = async () => {
            try {
                setLoading(true);
                setMessages([]);
                const res = await getMessages(thread.threadId);
                const msgs: Message[] = res.data?.data || [];
                setMessages(msgs);
                if (msgs.length > 0) setCursor(msgs[0].createdAt);
                setHasMore(msgs.length === 30);
            } catch (err) {
                console.error("Failed to load messages", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMessages();
    }, [thread.threadId]);

    // ── Mark messages seen ────────────────────────────────────────────────────
    useEffect(() => {
        if (messages.length === 0) return;
        const unseenIds = messages
            .filter((m) => m.senderId._id !== currentUserId && !(m.seenBy || []).includes(currentUserId))
            .map((m) => m._id);
        if (unseenIds.length > 0) {
            markMessagesSeen(thread.threadId, unseenIds).catch(() => {});
        }
    }, [messages, thread.threadId, currentUserId]);

    // ── Socket events ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!token) return;
        const socket = getSocket(token);
        socket.emit("join_thread", thread.threadId);

        const onNewMessage = (msg: Message) => {
            setMessages((prev) => {
                if (prev.some((m) => m._id === msg._id)) return prev;
                if (ownedMessageIds.current.has(msg._id)) {
                    ownedMessageIds.current.delete(msg._id);
                    return prev;
                }
                return [...prev, msg];
            });
            setNewMsgIds((prev) => new Set(prev).add(msg._id));
            setTimeout(() => {
                setNewMsgIds((prev) => {
                    const next = new Set(prev);
                    next.delete(msg._id);
                    return next;
                });
            }, 600);
            socket.emit("message_delivered", { messageId: msg._id });
        };

        const onUserTyping = () => setIsTyping(true);
        const onUserStopTyping = () => setIsTyping(false);

        const onMessagesSeen = ({ messageIds, seenBy }: { messageIds: string[]; seenBy: string }) => {
            setMessages((prev) =>
                prev.map((m) =>
                    messageIds.includes(m._id) ? { ...m, seenBy: [...(m.seenBy || []), seenBy] } : m
                )
            );
        };

        const onMessageDelivered = ({ messageId, userId }: { messageId: string; userId: string }) => {
            setMessages((prev) =>
                prev.map((m) =>
                    m._id === messageId ? { ...m, deliveredTo: [...(m.deliveredTo || []), userId] } : m
                )
            );
        };

        const onReactionUpdate = ({ messageId, userId, emoji }: { messageId: string; userId: string; emoji: string }) => {
            setMessages((prev) =>
                prev.map((m) =>
                    m._id === messageId
                        ? { ...m, reactions: [...(m.reactions || []).filter((r) => r.userId !== userId), { userId, emoji }] }
                        : m
                )
            );
        };

        socket.on("new_message", onNewMessage);
        socket.on("user_typing", onUserTyping);
        socket.on("user_stop_typing", onUserStopTyping);
        socket.on("messages_seen", onMessagesSeen);
        socket.on("message_delivered", onMessageDelivered);
        socket.on("reaction_update", onReactionUpdate);

        return () => {
            socket.emit("leave_thread", thread.threadId);
            socket.off("new_message", onNewMessage);
            socket.off("user_typing", onUserTyping);
            socket.off("user_stop_typing", onUserStopTyping);
            socket.off("messages_seen", onMessagesSeen);
            socket.off("message_delivered", onMessageDelivered);
            socket.off("reaction_update", onReactionUpdate);
        };
    }, [thread.threadId, token]);

    // ── Scroll to bottom ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!loading) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, loading]);

    // ── Load more ─────────────────────────────────────────────────────────────
    const loadMore = async () => {
        if (!hasMore || loadingMore || !cursor) return;
        try {
            setLoadingMore(true);
            const res = await getMessages(thread.threadId, cursor);
            const older: Message[] = res.data?.data || [];
            setMessages((prev) => [...older, ...prev]);
            if (older.length > 0) setCursor(older[0].createdAt);
            setHasMore(older.length === 30);
        } catch (err) {
            console.error("Failed to load more", err);
        } finally {
            setLoadingMore(false);
        }
    };

    // ── File pick ─────────────────────────────────────────────────────────────
    const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const mediaType = file.type.startsWith("image/") ? "image"
            : file.type.startsWith("video/") ? "video"
            : file.type.startsWith("audio/") ? "audio"
            : "file" as const;
        const previewUrl = (mediaType === "image" || mediaType === "video")
            ? URL.createObjectURL(file) : "";
        setAttachment({ file, previewUrl, mediaType });
        e.target.value = "";
    };

    const clearAttachment = () => {
        if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
        setAttachment(null);
    };

    // ── Send — fire and forget style ──────────────────────────────────────────
    const handleSend = () => {
        const content = inputValue.trim();
        const pendingAttachment = attachment;

        if (!content && !pendingAttachment) return;

        // Clear inputs immediately — feels instant
        setInputValue("");
        clearAttachment();

        const tempId = `temp_${Date.now()}`;

        // Show optimistic bubble right away with local preview if media
        const optimistic: Message = {
            _id: tempId,
            threadId: thread.threadId,
            senderId: { _id: currentUserId, username: "me" },
            content,
            createdAt: new Date().toISOString(),
            seenBy: [],
            deliveredTo: [],
            reactions: [],
            mediaUrl: pendingAttachment?.previewUrl,
            mediaType: pendingAttachment?.mediaType,
            type: pendingAttachment ? "media" : "text",
            _uploadProgress: pendingAttachment ? 0 : undefined,
        };

        setMessages((prev) => [...prev, optimistic]);
        setNewMsgIds((prev) => new Set(prev).add(tempId));

        // Run upload + send in background — UI is already updated
        const runSend = async () => {
            try {
                let mediaPayload: { mediaUrl: string; mediaType: string; mediaMeta?: object } | undefined;

                if (pendingAttachment) {
                    const uploaded = await uploadChatMedia(pendingAttachment.file, (pct) => {
                        // Update progress on the optimistic bubble
                        setMessages((prev) =>
                            prev.map((m) => m._id === tempId ? { ...m, _uploadProgress: pct } : m)
                        );
                    });
                    mediaPayload = {
                        mediaUrl: uploaded.url,
                        mediaType: uploaded.mediaType,
                        mediaMeta: uploaded.mediaMeta,
                    };
                    // Swap local blob URL for the real Cloudinary URL while we wait for API
                    setMessages((prev) =>
                        prev.map((m) =>
                            m._id === tempId
                                ? { ...m, mediaUrl: uploaded.url, _uploadProgress: undefined }
                                : m
                        )
                    );
                }

                const res = await sendMessage(thread.threadId, content, mediaPayload);
                const real: Message = res.data?.data;

                if (real?._id) {
                    ownedMessageIds.current.add(real._id);
                    setMessages((prev) => {
                        const withoutDupes = prev.filter((m) => m._id !== real._id);
                        return withoutDupes.map((m) => (m._id === tempId ? real : m));
                    });
                } else {
                    setMessages((prev) => prev.filter((m) => m._id !== tempId));
                }
            } catch (err) {
                console.error("Failed to send message", err);
                // Mark as failed — show retry option
                setMessages((prev) =>
                    prev.map((m) => m._id === tempId ? { ...m, _failed: true, _uploadProgress: undefined } : m)
                );
            }
        };

        runSend();
    };

    // ── Retry failed message ──────────────────────────────────────────────────
    const handleRetry = (failedMsg: Message) => {
        setMessages((prev) => prev.filter((m) => m._id !== failedMsg._id));
        // Reconstruct attachment if there was media (use the URL that was set)
        const hasMedia = !!failedMsg.mediaUrl;
        const tempId = `temp_${Date.now()}`;
        const retried: Message = {
            ...failedMsg,
            _id: tempId,
            _failed: false,
            _uploadProgress: hasMedia ? 0 : undefined,
            createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, retried]);

        const runRetry = async () => {
            try {
                let mediaPayload: { mediaUrl: string; mediaType: string } | undefined;
                if (failedMsg.mediaUrl && failedMsg.mediaType) {
                    mediaPayload = { mediaUrl: failedMsg.mediaUrl, mediaType: failedMsg.mediaType };
                }
                const res = await sendMessage(thread.threadId, failedMsg.content, mediaPayload);
                const real: Message = res.data?.data;
                if (real?._id) {
                    ownedMessageIds.current.add(real._id);
                    setMessages((prev) => {
                        const withoutDupes = prev.filter((m) => m._id !== real._id);
                        return withoutDupes.map((m) => (m._id === tempId ? real : m));
                    });
                } else {
                    setMessages((prev) => prev.filter((m) => m._id !== tempId));
                }
            } catch {
                setMessages((prev) =>
                    prev.map((m) => m._id === tempId ? { ...m, _failed: true, _uploadProgress: undefined } : m)
                );
            }
        };
        runRetry();
    };

    // ── Typing ────────────────────────────────────────────────────────────────
    const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        if (!token) return;
        const socket = getSocket(token);
        socket.emit("typing_start", { threadId: thread.threadId });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit("typing_stop", { threadId: thread.threadId });
        }, 1500);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // ── Status ────────────────────────────────────────────────────────────────
    const getStatus = (msg: Message) => {
        if (msg._failed) return "failed";
        if (msg._id.startsWith("temp_")) return "sending";
        if ((msg.seenBy || []).filter((id) => id !== currentUserId).length > 0) return "read";
        if ((msg.deliveredTo || []).filter((id) => id !== currentUserId).length > 0) return "delivered";
        return "sent";
    };

    return (
        <div className="flex flex-col h-full w-full bg-white dark:bg-[#0a0a0a] relative overflow-hidden">

            {/* Subtle dot grid */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.025] dark:opacity-[0.05]"
                style={{
                    backgroundImage: "radial-gradient(circle, #888 1px, transparent 1px)",
                    backgroundSize: "28px 28px",
                }}
            />

            {/* ── Header ── */}
            <div className="relative z-10 px-4 py-3.5 border-b border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="md:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500 hover:text-black dark:hover:text-white"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    {/* Avatar — clickable → profile */}
                    <button
                        onClick={() => router.push(`/profile/${username}`)}
                        className="relative shrink-0 focus:outline-none"
                    >
                        <div
                            className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-xs ring-2 ring-white dark:ring-zinc-800"
                            style={{ backgroundColor: profilePic ? undefined : getAvatarColor(username) }}
                        >
                            {profilePic ? (
                                <Image
                                    src={profilePic}
                                    alt={username}
                                    width={36}
                                    height={36}
                                    className="w-full h-full object-cover"
                                    unoptimized
                                />
                            ) : (
                                username.slice(0, 2).toUpperCase()
                            )}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white dark:border-[#0a0a0a]" />
                    </button>
                    <div>
                        {/* Username — clickable → profile */}
                        <button
                            onClick={() => router.push(`/profile/${username}`)}
                            className="font-semibold text-sm text-black dark:text-white leading-none hover:underline focus:outline-none"
                        >
                            {username}
                        </button>
                        <p className={`text-[10px] font-medium mt-0.5 transition-colors ${isTyping ? "text-emerald-500" : "text-zinc-400"}`}>
                            {isTyping ? "typing..." : "active now"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-0.5">
                    {[Phone, Video, MoreHorizontal].map((Icon, i) => (
                        <button key={i} className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all">
                            <Icon size={16} strokeWidth={2} />
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Messages ── */}
            <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4 space-y-1">

                {hasMore && !loading && (
                    <div className="flex justify-center pb-2">
                        <button
                            onClick={loadMore}
                            disabled={loadingMore}
                            className="text-[10px] font-semibold tracking-widest uppercase text-zinc-400 hover:text-black dark:hover:text-white transition-colors flex items-center gap-1.5 py-1 px-3 rounded-full border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600"
                        >
                            {loadingMore && <Loader2 size={10} className="animate-spin" />}
                            {loadingMore ? "Loading..." : "Load older"}
                        </button>
                    </div>
                )}

                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={18} className="animate-spin text-zinc-300 dark:text-zinc-600" />
                    </div>
                )}

                {!loading && messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div
                            className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl ring-4 ring-white dark:ring-zinc-800 shadow-lg"
                            style={{ backgroundColor: getAvatarColor(username) }}
                        >
                            {username.slice(0, 2).toUpperCase()}
                        </div>
                        <p className="font-semibold text-sm text-black dark:text-white">{username}</p>
                        <p className="text-[11px] text-zinc-400 tracking-wide">Say hi to get things started 👋</p>
                    </div>
                )}

                {!loading && messages.length > 0 && (
                    <div className="flex items-center gap-3 py-2">
                        <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
                        <span className="text-[10px] font-semibold text-zinc-400 tracking-widest uppercase">Today</span>
                        <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
                    </div>
                )}

                {messages.map((msg, i) => {
                    const isMine = msg.senderId._id === currentUserId;
                    const prevMsg = messages[i - 1];
                    const nextMsg = messages[i + 1];
                    const isFirst = !prevMsg || prevMsg.senderId._id !== msg.senderId._id;
                    const isLast = !nextMsg || nextMsg.senderId._id !== msg.senderId._id;
                    const isTemp = msg._id.startsWith("temp_");
                    const isNew = newMsgIds.has(msg._id);
                    const status = getStatus(msg);
                    const isUploading = msg._uploadProgress !== undefined;

                    const myRadius = `${isFirst ? "20px" : "6px"} 20px 20px ${isLast ? "20px" : "6px"}`;
                    const theirRadius = `20px ${isFirst ? "20px" : "6px"} ${isLast ? "20px" : "6px"} 20px`;

                    return (
                        <div
                            key={msg._id}
                            className={`flex flex-col ${isMine ? "items-end" : "items-start"} ${isFirst && i > 0 ? "mt-3" : "mt-0.5"}`}
                            style={{
                                animation: isNew ? "slideIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards" : undefined,
                                opacity: isNew ? 0 : 1,
                            }}
                            onMouseEnter={() => setHoveredMsg(msg._id)}
                            onMouseLeave={() => setHoveredMsg(null)}
                        >
                            <div className="relative flex items-end gap-2 group max-w-[75%] md:max-w-[60%]">

                                {!isMine && (
                                    <div className="w-6 h-6 shrink-0 mb-0.5">
                                        {isLast && (
                                            <div
                                                className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[9px]"
                                                style={{ backgroundColor: getAvatarColor(username) }}
                                            >
                                                {username.slice(0, 1).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Reaction picker */}
                                {hoveredMsg === msg._id && !isTemp && (
                                    <div
                                        className={`absolute ${isMine ? "right-full mr-2" : "left-full ml-2"} bottom-0 z-30 flex items-center gap-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-full px-2 py-1.5 shadow-xl`}
                                        style={{ animation: "popIn 0.15s cubic-bezier(0.34, 1.56, 0.64, 1) forwards" }}
                                    >
                                        {EMOJI_OPTIONS.map((emoji) => (
                                            <button
                                                key={emoji}
                                                className="w-7 h-7 flex items-center justify-center text-base hover:scale-125 transition-transform rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setMessages((prev) =>
                                                        prev.map((m) =>
                                                            m._id === msg._id
                                                                ? { ...m, reactions: [...(m.reactions || []).filter((r) => r.userId !== currentUserId), { userId: currentUserId, emoji }] }
                                                                : m
                                                        )
                                                    );
                                                    setHoveredMsg(null);
                                                    addReaction(msg._id, emoji).catch(() => {
                                                        setMessages((prev) =>
                                                            prev.map((m) =>
                                                                m._id === msg._id
                                                                    ? { ...m, reactions: (m.reactions || []).filter((r) => r.userId !== currentUserId) }
                                                                    : m
                                                            )
                                                        );
                                                    });
                                                }}
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Bubble */}
                                <div
                                    className={`text-[14px] leading-relaxed overflow-hidden transition-opacity ${
                                        isTemp && !msg._failed ? "opacity-60" : "opacity-100"
                                    } ${
                                        msg.mediaUrl && !msg.content
                                            ? "p-0 bg-transparent"
                                            : isMine
                                                ? "px-3.5 py-2.5 bg-black text-white dark:bg-white dark:text-black"
                                                : "px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                                    }`}
                                    style={{ borderRadius: isMine ? myRadius : theirRadius, wordBreak: "break-word" }}
                                >
                                    {/* Image — clickable lightbox */}
                                    {msg.mediaUrl && msg.mediaType === "image" && (
                                        <div
                                            className="relative overflow-hidden cursor-pointer"
                                            style={{ borderRadius: isMine ? myRadius : theirRadius }}
                                            onClick={() => !isUploading && setLightboxUrl(msg.mediaUrl!)}
                                        >
                                            <img
                                                src={msg.mediaUrl}
                                                alt="media"
                                                className="max-w-[260px] max-h-[320px] object-cover block transition-transform duration-200 hover:scale-[1.02]"
                                                style={{ borderRadius: isMine ? myRadius : theirRadius }}
                                            />
                                            {isUploading && (
                                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                                                    <div
                                                        className="h-full bg-white transition-all duration-200 ease-out"
                                                        style={{ width: `${msg._uploadProgress ?? 0}%` }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Video — show local preview instantly, controls hidden until uploaded */}
                                    {/* Video — custom player with lightbox */}
                                    {msg.mediaUrl && msg.mediaType === "video" && (
                                        <VideoPlayer
                                            src={msg.mediaUrl}
                                            radius={isMine ? myRadius : theirRadius}
                                            isUploading={isUploading}
                                            uploadProgress={msg._uploadProgress}
                                            onExpand={() => !isUploading && openVideoLightbox(msg.mediaUrl!)}
                                        />
                                    )}

                                    {/* Audio — custom player */}
                                    {msg.mediaUrl && msg.mediaType === "audio" && (
                                        <AudioPlayer
                                            src={msg.mediaUrl}
                                            isMine={isMine}
                                            radius={isMine ? myRadius : theirRadius}
                                            isUploading={isUploading}
                                            uploadProgress={msg._uploadProgress}
                                        />
                                    )}

                                    {/* File */}
                                    {msg.mediaUrl && msg.mediaType === "file" && (
                                        <div
                                            className={`flex items-center gap-2 px-3.5 py-2.5 ${isMine ? "bg-black text-white dark:bg-white dark:text-black" : "bg-zinc-100 dark:bg-zinc-800"}`}
                                            style={{ borderRadius: isMine ? myRadius : theirRadius }}
                                        >
                                            {isUploading
                                                ? <><Loader2 size={14} className="animate-spin" /><span className="text-[11px]">{msg._uploadProgress}%</span></>
                                                : <><FileIcon size={16} className="shrink-0" /><span className="text-[13px] truncate max-w-[180px]">Download file</span></>
                                            }
                                        </div>
                                    )}

                                    {/* Caption / text */}
                                    {msg.content && (
                                        <p className={msg.mediaUrl ? "px-3.5 pt-2 pb-2.5" : ""}>{msg.content}</p>
                                    )}

                                    {/* Reactions */}
                                    {(msg.reactions?.length > 0) && (
                                        <div className={`flex gap-0.5 mt-1.5 flex-wrap ${msg.mediaUrl && !msg.content ? "px-3.5 pb-2" : ""}`}>
                                            {msg.reactions.map((r, ri) => (
                                                <span key={ri} className="text-xs bg-white/20 dark:bg-black/20 rounded-full px-1 py-0.5">{r.emoji}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Status row */}
                            {isMine && isLast && (
                                <div className="flex items-center gap-1.5 mt-1 pr-1">
                                    <span className="text-[10px] text-zinc-400">{formatTime(msg.createdAt)}</span>
                                    {status === "sending" && <span className="text-[10px] text-zinc-400">Sending…</span>}
                                    {status === "failed" && (
                                        <button
                                            onClick={() => handleRetry(msg)}
                                            className="text-[10px] text-red-400 font-medium hover:text-red-500 transition-colors"
                                        >
                                            Failed · Tap to retry
                                        </button>
                                    )}
                                    {status === "read" && <span className="text-[10px] text-blue-400 font-medium">Read</span>}
                                    {status === "delivered" && <span className="text-[10px] text-zinc-400">Delivered</span>}
                                    {status === "sent" && <span className="text-[10px] text-zinc-400">Sent</span>}
                                </div>
                            )}
                            {!isMine && isLast && (
                                <div className="flex items-center gap-1 mt-1 pl-8">
                                    <span className="text-[10px] text-zinc-400">{formatTime(msg.createdAt)}</span>
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Typing indicator */}
                {isTyping && (
                    <div className="flex items-end gap-2 mt-2" style={{ animation: "slideIn 0.2s ease forwards" }}>
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[9px] shrink-0" style={{ backgroundColor: getAvatarColor(username) }}>
                            {username.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-[20px] rounded-bl-[6px] px-4 py-3 flex gap-1 items-center">
                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0ms", animationDuration: "0.8s" }} />
                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "150ms", animationDuration: "0.8s" }} />
                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "300ms", animationDuration: "0.8s" }} />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* ── Input ── */}
            <div className="relative z-10 border-t border-zinc-100 dark:border-zinc-800/60 bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-xl shrink-0">

                {/* Attachment preview */}
                {attachment && (
                    <div className="px-4 pt-3 pb-1 flex items-center gap-3">
                        <div className="relative">
                            {attachment.mediaType === "image" && attachment.previewUrl && (
                                <img src={attachment.previewUrl} alt="preview" className="w-16 h-16 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700" />
                            )}
                            {attachment.mediaType === "video" && attachment.previewUrl && (
                                <video src={attachment.previewUrl} className="w-16 h-16 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700" />
                            )}
                            {(attachment.mediaType === "audio" || attachment.mediaType === "file") && (
                                <div className="w-16 h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex flex-col items-center justify-center border border-zinc-200 dark:border-zinc-700">
                                    <FileIcon size={20} className="text-zinc-500" />
                                    <span className="text-[9px] text-zinc-400 mt-1 uppercase tracking-wide">{attachment.mediaType}</span>
                                </div>
                            )}
                            <button
                                onClick={clearAttachment}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-zinc-800 dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                            >
                                <X size={10} strokeWidth={3} />
                            </button>
                        </div>
                        <div className="flex-1">
                            <p className="text-[11px] font-semibold text-black dark:text-white truncate max-w-[200px]">{attachment.file.name}</p>
                            <p className="text-[10px] text-zinc-400 mt-0.5">{(attachment.file.size / 1024).toFixed(0)} KB</p>
                        </div>
                    </div>
                )}

                <div className="px-4 py-3 flex items-center gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.zip"
                        className="hidden"
                        onChange={handleFilePick}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all shrink-0"
                    >
                        <Paperclip size={17} strokeWidth={2} />
                    </button>

                    <div className="flex-1 flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/80 rounded-full px-4 py-2.5 border border-transparent focus-within:border-zinc-300 dark:focus-within:border-zinc-600 transition-all">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={handleTyping}
                            onKeyDown={handleKeyDown}
                            placeholder={attachment ? "Add a caption..." : `Message ${username}...`}
                            className="flex-1 bg-transparent outline-none text-sm text-black dark:text-white placeholder:text-zinc-400"
                        />

                    </div>

                    <button
                        onClick={handleSend}
                        disabled={!inputValue.trim() && !attachment}
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                            inputValue.trim() || attachment
                                ? "bg-black dark:bg-white text-white dark:text-black hover:scale-105 active:scale-95 shadow-md"
                                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                        }`}
                    >
                        <ArrowUp size={15} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(8px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes popIn {
                    from { opacity: 0; transform: scale(0.8); }
                    to   { opacity: 1; transform: scale(1); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes zoomIn {
                    from { opacity: 0; transform: scale(0.92); }
                    to   { opacity: 1; transform: scale(1); }
                }
            `}</style>

            {/* Lightbox */}
            {lightboxUrl && <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
            {videoLightboxUrl && <VideoLightbox url={videoLightboxUrl} onClose={() => setVideoLightboxUrl(null)} />}
        </div>
    );
}