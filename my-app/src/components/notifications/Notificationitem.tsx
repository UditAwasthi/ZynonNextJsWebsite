"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Heart, MessageCircle, Mail, UserPlus, UserCheck, AtSign, FileText, Check, X } from "lucide-react";
import { acceptFollowRequest, rejectFollowRequest } from "../../lib/api/followApi";
import type { Notification } from "./types";

function getNotificationMeta(n: Notification): { text: string; href: string; Icon: React.ElementType; iconBg: string } {
    const name = n.actor?.username ?? "Someone";
    switch (n.type) {
        case "POST_LIKE":
            return { text: `liked your post`, href: `/posts/${n.entityId}`, Icon: Heart, iconBg: "bg-red-500" };
        case "POST_COMMENT":
            return { text: `commented on your post`, href: `/posts/${n.metadata?.postId ?? n.entityId}`, Icon: MessageCircle, iconBg: "bg-blue-500" };
        case "COMMENT_LIKE":
            return { text: `liked your comment`, href: `/posts/${n.metadata?.postId ?? n.entityId}`, Icon: Heart, iconBg: "bg-pink-500" };
        case "NEW_MESSAGE":
            return { text: `sent you a message`, href: `/messages/${n.metadata?.threadId ?? n.entityId}`, Icon: Mail, iconBg: "bg-violet-500" };
        case "FOLLOW_REQUEST":
            return { text: `sent you a follow request`, href: `/profile/${name}`, Icon: UserPlus, iconBg: "bg-amber-500" };
        case "FOLLOW_ACCEPTED":
            return { text: `accepted your follow request`, href: `/profile/${name}`, Icon: UserCheck, iconBg: "bg-green-500" };
        case "MENTION":
            return { text: `mentioned you in a post`, href: `/posts/${n.entityId}`, Icon: AtSign, iconBg: "bg-cyan-500" };
        case "NEW_POST":
            return { text: `shared a new post`, href: `/posts/${n.entityId}`, Icon: FileText, iconBg: "bg-zinc-500" };
        default:
            return { text: `sent you a notification`, href: "/", Icon: Heart, iconBg: "bg-zinc-400" };
    }
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d`;
    return `${Math.floor(d / 7)}w`;
}

type FollowAction = "idle" | "loading_accept" | "loading_reject" | "accepted" | "rejected";

interface Props {
    notification: Notification;
    onRead: (id: string) => void;
}

export function NotificationItem({ notification: n, onRead }: Props) {
    const router = useRouter();
    const { text, href, Icon, iconBg } = getNotificationMeta(n);
    const [followAction, setFollowAction] = useState<FollowAction>("idle");

    const isFollowRequest = n.type === "FOLLOW_REQUEST";

    const handleClick = () => {
        if (isFollowRequest) return; // clicks handled by buttons
        if (!n.read) onRead(n._id);
        router.push(href);
    };

    const handleAccept = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setFollowAction("loading_accept");
        try {
            await acceptFollowRequest(n.actor._id);
            setFollowAction("accepted");
            if (!n.read) onRead(n._id);
        } catch {
            setFollowAction("idle");
        }
    };

    const handleReject = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setFollowAction("loading_reject");
        try {
            await rejectFollowRequest(n.actor._id);
            setFollowAction("rejected");
            if (!n.read) onRead(n._id);
        } catch {
            setFollowAction("idle");
        }
    };

    const handleProfileClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        router.push(`/profile/${n.actor?.username}`);
    };

    return (
        <div
            onClick={handleClick}
            className={`
                w-full flex items-center gap-3 px-4 py-3
                border-b border-zinc-100 dark:border-zinc-900
                transition-colors duration-150 relative
                ${!isFollowRequest ? "cursor-pointer" : "cursor-default"}
                ${n.read
                    ? "bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-950"
                    : "bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                }
            `}
        >
            {/* Unread bar */}
            {!n.read && (
                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-black dark:bg-white" />
            )}

            {/* Avatar */}
            <div
                className="relative shrink-0 cursor-pointer"
                onClick={handleProfileClick}
            >
                <div className="w-10 h-10 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
                    {n.actor?.profilePicture ? (
                        <Image
                            src={n.actor.profilePicture}
                            alt={n.actor.username}
                            width={40}
                            height={40}
                            className="object-cover w-full h-full"
                            unoptimized
                        />
                    ) : (
                        <span className="text-[13px] font-bold text-zinc-500 dark:text-zinc-400 uppercase">
                            {(n.actor?.username ?? "?").slice(0, 2)}
                        </span>
                    )}
                </div>
                {/* Type badge */}
                <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${iconBg} flex items-center justify-center border-2 border-white dark:border-black`}>
                    <Icon size={8} className="text-white" strokeWidth={2.5} />
                </div>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
                <p className={`text-[12px] leading-snug ${n.read ? "text-zinc-500 dark:text-zinc-400" : "text-black dark:text-white"}`}>
                    <span
                        className="font-semibold hover:underline cursor-pointer"
                        onClick={handleProfileClick}
                    >
                        {n.actor?.username}
                    </span>
                    {" "}{text}
                </p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5">
                    {timeAgo(n.createdAt)}
                </p>
            </div>

            {/* Follow request actions */}
            {isFollowRequest && (
                <div className="shrink-0 flex items-center gap-1.5">
                    {followAction === "accepted" && (
                        <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-green-600 dark:text-green-400">
                            Confirmed
                        </span>
                    )}
                    {followAction === "rejected" && (
                        <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-zinc-400">
                            Deleted
                        </span>
                    )}
                    {(followAction === "idle" || followAction === "loading_accept" || followAction === "loading_reject") && (
                        <>
                            {/* Accept */}
                            <button
                                onClick={handleAccept}
                                disabled={followAction !== "idle"}
                                className="flex items-center gap-1 px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold tracking-[0.1em] uppercase transition-all hover:opacity-80 active:scale-95 disabled:opacity-50"
                            >
                                {followAction === "loading_accept" ? (
                                    <span className="w-3 h-3 border border-white dark:border-black border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <><Check size={10} strokeWidth={3} /> Confirm</>
                                )}
                            </button>

                            {/* Reject */}
                            <button
                                onClick={handleReject}
                                disabled={followAction !== "idle"}
                                className="flex items-center gap-1 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 text-black dark:text-white text-[10px] font-bold tracking-[0.1em] uppercase border border-zinc-200 dark:border-zinc-800 transition-all hover:border-black dark:hover:border-white active:scale-95 disabled:opacity-50"
                            >
                                {followAction === "loading_reject" ? (
                                    <span className="w-3 h-3 border border-black dark:border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <><X size={10} strokeWidth={3} /> Delete</>
                                )}
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Unread dot (only for non-follow-request) */}
            {!n.read && !isFollowRequest && (
                <div className="shrink-0 w-2 h-2 rounded-full bg-black dark:bg-white" />
            )}
        </div>
    );
}