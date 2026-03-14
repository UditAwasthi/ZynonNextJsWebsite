"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Plus, Loader2, ImageIcon, Film, Mic, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getInbox } from "../../lib/api/chatApi";
import { getSocket } from "../../lib/socket";
import api from "../../lib/api/api";

interface Thread {
  threadId: string;
  type: "dm" | "group";
  user: { _id: string; username: string; profilePicture?: string } | null;
  lastMessage: {
    content?: string;
    createdAt?: string;
    senderId?: string;
    mediaType?: "image" | "video" | "audio" | "file";
  } | null;
  lastActivity: string;
  unreadCount?: number;
}

interface SocketMessage {
  _id: string;
  threadId: string;
  senderId: { _id: string; username: string };
  content?: string;
  createdAt: string;
  mediaType?: "image" | "video" | "audio" | "file";
  type?: "text" | "media";
}

interface Props {
  onSelect: (thread: Thread) => void;
  activeId?: string;
  currentUserId: string;
  token: string;
  unreadMap?: Record<string, number>;
  onThreadOpen?: (threadId: string) => void;
}

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

async function enrichThreadsWithPics(threads: Thread[]): Promise<Thread[]> {
  const usernamesToFetch = threads
    .filter(t => t.user?.username && !t.user.profilePicture && !profilePicCache.has(t.user.username))
    .map(t => t.user!.username);
  if (usernamesToFetch.length > 0) {
    await Promise.allSettled([...new Set(usernamesToFetch)].map(u => fetchProfilePic(u)));
  }
  return threads.map(t => {
    if (!t.user?.username) return t;
    const pic = t.user.profilePicture ?? profilePicCache.get(t.user.username) ?? null;
    return pic ? { ...t, user: { ...t.user, profilePicture: pic } } : t;
  });
}

const getInitials = (username: string) => username.slice(0, 2).toUpperCase();

const getAvatarColor = (username: string) => {
  const colors = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#ef4444"];
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash += username.charCodeAt(i);
  return colors[hash % colors.length];
};

const formatTime = (iso?: string) => {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

function LastMessagePreview({ thread, isActive }: { thread: Thread; isActive: boolean }) {
  const m = thread.lastMessage;
  const base = `text-[13px] truncate ${isActive ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-500 dark:text-zinc-400"}`;
  if (!m) return <span className={base}>Start a conversation</span>;
  if (m.mediaType === "image") return <span className={`${base} flex items-center gap-1`}><ImageIcon size={12} className="shrink-0" />Photo</span>;
  if (m.mediaType === "video") return <span className={`${base} flex items-center gap-1`}><Film size={12} className="shrink-0" />Video</span>;
  if (m.mediaType === "audio") return <span className={`${base} flex items-center gap-1`}><Mic size={12} className="shrink-0" />Audio</span>;
  return <span className={base}>{m.content || "Start a conversation"}</span>;
}

export default function InboxList({ onSelect, activeId, currentUserId, token, unreadMap = {}, onThreadOpen }: Props) {
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchInbox = async () => {
      try {
        setLoading(true);
        const res = await getInbox();
        const raw: Thread[] = res.data?.data || [];
        const enriched = await enrichThreadsWithPics(raw);
        setThreads(enriched);
      } catch {
        setError("Failed to load conversations");
      } finally {
        setLoading(false);
      }
    };
    fetchInbox();
  }, []);

  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);
    const handleNewMessage = (msg: SocketMessage) => {
      const tid = typeof msg.threadId === "string" ? msg.threadId : (msg.threadId as any).toString();
      setThreads((prev) => {
        const idx = prev.findIndex((t) => t.threadId === tid);
        if (idx === -1) return prev;
        const updated: Thread = {
          ...prev[idx],
          lastMessage: { content: msg.content || "", createdAt: msg.createdAt, senderId: msg.senderId._id, mediaType: msg.mediaType },
          lastActivity: msg.createdAt,
        };
        return [updated, ...prev.filter((_, i) => i !== idx)];
      });
    };
    socket.on("new_message", handleNewMessage);
    return () => { socket.off("new_message", handleNewMessage); };
  }, [token]);

  const handleProfileClick = useCallback((e: React.MouseEvent, username: string) => {
    e.stopPropagation();
    router.push(`/profile/${username}`);
  }, [router]);

  const filtered = threads.filter((t) =>
    t.user?.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full h-full bg-white dark:bg-black">
      <style>{`
        .inbox-no-scrollbar::-webkit-scrollbar { display: none; }
        .inbox-no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes inboxSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .inbox-row-enter { animation: inboxSlideIn 0.2s ease forwards; }
      `}</style>

      {/* ── Header ── */}
      <div className="px-4 pt-6 pb-3 flex items-center justify-between shrink-0 border-b border-zinc-100 dark:border-zinc-900">
        <div>
          <p className="text-[9px] font-black tracking-[0.35em] uppercase text-zinc-400 dark:text-zinc-600 mb-0.5">Messages</p>
          <h1 className="font-nothing text-2xl tracking-widest text-black dark:text-white leading-none">Comms</h1>
        </div>
        <button className="w-9 h-9 rounded-full border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-500 hover:bg-black hover:text-white hover:border-black dark:hover:bg-white dark:hover:text-black dark:hover:border-white transition-all duration-200">
          <Plus size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* ── Search ── */}
      <div className="px-4 py-3 shrink-0">
        <div className="relative flex items-center group">
          <Search size={14} className="absolute left-3.5 text-zinc-400 dark:text-zinc-600 group-focus-within:text-black dark:group-focus-within:text-white transition-colors pointer-events-none" />
          <input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-100 dark:bg-zinc-900 border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 rounded-xl py-2.5 pl-9 pr-4 text-[13px] outline-none transition-all text-black dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
          />
        </div>
      </div>

      {/* ── List ── */}
      <div className="overflow-y-auto flex-1 inbox-no-scrollbar">
        {loading && (
          <div className="px-4 py-1 space-y-1">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-3 animate-pulse">
                <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-900 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-zinc-100 dark:bg-zinc-900 rounded-full w-1/3" />
                  <div className="h-2.5 bg-zinc-100 dark:bg-zinc-900 rounded-full w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 px-6">
            <p className="text-[12px] text-red-400 text-center">{error}</p>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 px-6">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
              <MessageSquare size={20} className="text-zinc-300 dark:text-zinc-700" strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">{search ? "No results" : "No conversations"}</p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-600 mt-1">{search ? "Try a different name" : "Start a new message"}</p>
            </div>
          </div>
        )}

        {!loading && !error && filtered.map((thread, idx) => {
          const username = thread.user?.username || "Unknown";
          const isActive = activeId === thread.threadId;
          const isLastMine = thread.lastMessage?.senderId === currentUserId;
          const avatarColor = getAvatarColor(username);
          const unread = unreadMap[thread.threadId] ?? thread.unreadCount ?? 0;
          const hasUnread = unread > 0;
          const profilePic = thread.user?.profilePicture;

          return (
            <button
              key={thread.threadId}
              onClick={() => { onSelect(thread); onThreadOpen?.(thread.threadId); }}
              className={`
                inbox-row-enter w-full flex items-center gap-3 px-4 py-3.5
                transition-colors duration-150 relative
                ${isActive
                  ? "bg-zinc-100 dark:bg-zinc-900"
                  : hasUnread
                    ? "bg-blue-50/60 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-950"
                }
              `}
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              {/* Unread accent bar */}
              {hasUnread && !isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 bg-black dark:bg-white rounded-r-full" />
              )}

              {/* Avatar */}
              <div
                className="relative shrink-0"
                onClick={(e) => handleProfileClick(e, username)}
              >
                <div
                  className={`w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-base transition-all duration-200 ${
                    hasUnread && !isActive ? "ring-2 ring-black dark:ring-white ring-offset-2 ring-offset-white dark:ring-offset-black" : ""
                  }`}
                  style={{ backgroundColor: profilePic ? undefined : avatarColor }}
                >
                  {profilePic ? (
                    <Image src={profilePic} alt={username} width={56} height={56} className="w-full h-full object-cover" unoptimized />
                  ) : (
                    getInitials(username)
                  )}
                </div>
                {/* Online dot */}
                <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white dark:border-black" />
                {/* Unread badge */}
                {hasUnread && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-[4px] bg-black dark:bg-white border-2 border-white dark:border-black rounded-full flex items-center justify-center text-[9px] font-black text-white dark:text-black pointer-events-none">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex flex-col items-start overflow-hidden flex-1 min-w-0">
                <div className="flex justify-between w-full items-baseline gap-2">
                  <span
                    className={`text-[15px] truncate leading-tight ${
                      hasUnread && !isActive
                        ? "font-bold text-black dark:text-white"
                        : isActive
                          ? "font-semibold text-black dark:text-white"
                          : "font-medium text-black dark:text-white"
                    }`}
                  >
                    {username}
                  </span>
                  <span className={`text-[11px] shrink-0 tabular-nums ${
                    hasUnread && !isActive ? "font-bold text-black dark:text-white" : "text-zinc-400 dark:text-zinc-600"
                  }`}>
                    {formatTime(thread.lastMessage?.createdAt || thread.lastActivity)}
                  </span>
                </div>

                <div className="flex items-center justify-between w-full mt-0.5 gap-2">
                  <div className={`flex items-center gap-1 text-[13px] truncate flex-1 min-w-0 ${
                    hasUnread && !isActive
                      ? "font-semibold text-zinc-800 dark:text-zinc-200"
                      : "text-zinc-500 dark:text-zinc-500"
                  }`}>
                    {isLastMine && !hasUnread && (
                      <span className="text-zinc-400 dark:text-zinc-600 shrink-0 text-[12px]">You: </span>
                    )}
                    <LastMessagePreview thread={thread} isActive={isActive} />
                  </div>

                  {/* Unread dot (alternative indicator for when count is shown on avatar) */}
                  {hasUnread && !isActive && (
                    <div className="shrink-0 w-2 h-2 rounded-full bg-black dark:bg-white" />
                  )}
                </div>
              </div>
            </button>
          );
        })}

        {/* Bottom padding for mobile safe area */}
        <div className="h-6 shrink-0" />
      </div>
    </div>
  );
}