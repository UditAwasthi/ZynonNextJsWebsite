"use client";

import { useEffect, useState } from "react";
import { Search, Plus, Loader2 } from "lucide-react";
import { getInbox } from "../../lib/api/chatApi";

interface Thread {
  threadId: string;
  type: "dm" | "group";
  user: { _id: string; username: string } | null;
  lastMessage: {
    content?: string;
    createdAt?: string;
    senderId?: string;
  } | null;
  lastActivity: string;
  unreadCount?: number;
}

interface Props {
  onSelect: (thread: Thread) => void;
  activeId?: string;
  currentUserId: string;
  unreadMap?: Record<string, number>;
}

const getInitials = (username: string) => username.slice(0, 2).toUpperCase();

const getAvatarColor = (username: string) => {
  const colors = [
    "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#ef4444",
  ];
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

export default function InboxList({ onSelect, activeId, currentUserId, unreadMap = {} }: Props) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchInbox = async () => {
      try {
        setLoading(true);
        const res = await getInbox();
        setThreads(res.data?.data || []);
      } catch (err: any) {
        setError("Failed to load conversations");
      } finally {
        setLoading(false);
      }
    };
    fetchInbox();
  }, []);

  const filtered = threads.filter((t) =>
    t.user?.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full h-full bg-[#fafafa] dark:bg-black">
      {/* Header */}
      <div className="p-6 flex justify-between items-end shrink-0 pt-8">
        <div>
          <h1 className="font-nothing text-3xl uppercase tracking-widest text-black dark:text-white leading-none">
            Comms
          </h1>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400 dark:text-zinc-500 mt-2">
            {loading ? "Loading..." : `${threads.length} conversations`}
          </p>
        </div>
        <button className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-900 flex items-center justify-center hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors">
          <Plus size={18} strokeWidth={2} />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-4 shrink-0">
        <div className="relative flex items-center w-full group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search
              size={16}
              className="text-zinc-400 dark:text-zinc-500 group-focus-within:text-black dark:group-focus-within:text-white transition-colors"
            />
          </div>
          <input
            placeholder="SEARCH..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-full py-3 pl-12 pr-4 text-[11px] font-bold tracking-[0.15em] uppercase outline-none focus:border-black dark:focus:border-white transition-all text-black dark:text-white placeholder:text-zinc-400"
          />
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1 no-scrollbar px-3 space-y-1">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-zinc-400" />
          </div>
        )}

        {error && (
          <p className="text-center text-red-400 text-xs py-8">{error}</p>
        )}

        {!loading && !error && filtered.length === 0 && (
          <p className="text-center text-zinc-400 text-xs py-8 uppercase tracking-widest">
            {search ? "No results" : "No conversations yet"}
          </p>
        )}

        {!loading &&
          filtered.map((thread) => {
            const username = thread.user?.username || "Unknown";
            const isActive = activeId === thread.threadId;
            const isLastMine = thread.lastMessage?.senderId === currentUserId;
            const avatarColor = getAvatarColor(username);
            const unread = unreadMap[thread.threadId] ?? thread.unreadCount ?? 0;

            return (
              <button
                key={thread.threadId}
                onClick={() => onSelect(thread)}
                className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all ${
                  isActive
                    ? "bg-black text-white dark:bg-white dark:text-black shadow-md"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-900"
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: isActive ? "#555" : avatarColor }}
                  >
                    {getInitials(username)}
                  </div>
                  {/* Online dot */}
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#fafafa] dark:border-black" />
                  {/* Unread badge */}
                  {!!unread && (
                    <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 border-2 border-white dark:border-black rounded-full flex items-center justify-center">
                      <span className="text-[8px] font-bold text-white">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-col items-start overflow-hidden flex-1">
                  <div className="flex justify-between w-full items-baseline mb-0.5">
                    <span
                      className={`text-[15px] font-semibold truncate pr-2 ${
                        isActive ? "text-white dark:text-black" : "text-black dark:text-white"
                      }`}
                    >
                      {username}
                    </span>
                    <span
                      className={`text-[9px] font-bold tracking-widest shrink-0 ${
                        isActive ? "text-zinc-400 dark:text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      {formatTime(thread.lastMessage?.createdAt || thread.lastActivity)}
                    </span>
                  </div>
                  <span
                    className={`text-[13px] truncate w-full text-left ${
                      isActive ? "text-zinc-300 dark:text-zinc-700" : "text-zinc-500"
                    }`}
                  >
                    {isLastMine && <span className="opacity-60">You: </span>}
                    {thread.lastMessage?.content || "Start a conversation"}
                  </span>
                </div>
              </button>
            );
          })}
      </div>
    </div>
  );
}