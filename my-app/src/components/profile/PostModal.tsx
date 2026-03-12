"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import {
    X, ChevronLeft, ChevronRight, Send, UserCircle2,
    MessageCircle, Heart, MoreHorizontal, Trash2, Pencil,
    Bookmark, Share2, Smile, VolumeX, Volume2,
} from "lucide-react"
import {
    getSinglePost, toggleLike, getComments, createComment,
    getReplies, deleteComment, deletePost, editComment,
} from "../../lib/api/postApi"
import api from "../../lib/api/api"

interface PostAuthor { _id: string; username: string }
interface PostProfile { profilePicture?: string; name?: string }

interface PostDetail {
    postId: string; caption?: string
    media: { url: string; type: "image" | "video" }[]
    likesCount: number; commentsCount: number; createdAt: string
    isLiked: boolean; author: PostAuthor; profile: PostProfile
}

interface Reply {
    replyId: string; text: string; createdAt: string
    likesCount: number; isLiked: boolean
    author: PostAuthor; profile: PostProfile
    _parentReplyId?: string
}

interface Comment {
    commentId: string; text: string; createdAt: string
    likesCount: number; repliesCount: number; isLiked: boolean
    previewReplies: { _id: string; text: string; author: PostAuthor }[]
    author: PostAuthor; profile: PostProfile
}

interface ReplyTarget {
    parentCommentId: string
    parentReplyId?: string
    username: string
}

interface PostModalProps {
    postId: string
    onClose: () => void
    onDelete?: (id: string) => void
}

const postCache = new Map<string, { data: PostDetail; ts: number }>()
const commentCache = new Map<string, { comments: Comment[]; cursor: string | undefined; ts: number }>()
const CACHE_TTL = 3 * 60 * 1000

const F = {
    body: `"SF Pro Text", -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif`,
    display: `"SF Pro Display", -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif`,
    mono: `"SF Mono", ui-monospace, "Cascadia Code", monospace`,
}

const GCSS = `
:root {
  --pm-bg:         #FFFFFF;
  --pm-surface:    #F5F5F5;
  --pm-surface2:   #EBEBEB;
  --pm-border:     rgba(0,0,0,0.09);
  --pm-border-md:  rgba(0,0,0,0.15);
  --pm-label:      #0D0D0D;
  --pm-sub:        #555555;
  --pm-muted:      #999999;
  --pm-red:        #FF2222;
  --pm-black:      #0D0D0D;
  --pm-media-bg:   #0D0D0D;
  --pm-skel-a:     #EFEFEF;
  --pm-skel-b:     #E4E4E4;
  --pm-scroll-th:  #D0D0D0;
  --pm-ibtn-hover: rgba(0,0,0,0.055);
  --pm-menu-bg:    #FFFFFF;
  --pm-toast-bg:   #0D0D0D;
  --pm-toast-fg:   #FFFFFF;
  --pm-reply-chip: #F5F5F5;
  --pm-input-bg:   #F5F5F5;
  --pm-dot-color:  rgba(0,0,0,0.07);
  --pm-media-dot:  rgba(255,255,255,0.055);
  --pm-overlay:    rgba(0,0,0,0.72);
}
@media (prefers-color-scheme: dark) {
  :root {
    --pm-bg:         #0D0D0D;
    --pm-surface:    #1A1A1A;
    --pm-surface2:   #242424;
    --pm-border:     rgba(255,255,255,0.06);
    --pm-border-md:  rgba(255,255,255,0.12);
    --pm-label:      #F0F0F0;
    --pm-sub:        #A0A0A0;
    --pm-muted:      #555555;
    --pm-red:        #FF3C3C;
    --pm-black:      #F0F0F0;
    --pm-media-bg:   #0A0A0A;
    --pm-skel-a:     #1A1A1A;
    --pm-skel-b:     #242424;
    --pm-scroll-th:  #333333;
    --pm-ibtn-hover: rgba(255,255,255,0.07);
    --pm-menu-bg:    #1A1A1A;
    --pm-toast-bg:   #F0F0F0;
    --pm-toast-fg:   #0D0D0D;
    --pm-reply-chip: #1A1A1A;
    --pm-input-bg:   #1A1A1A;
    --pm-dot-color:  rgba(255,255,255,0.055);
    --pm-media-dot:  rgba(255,255,255,0.055);
    --pm-overlay:    rgba(0,0,0,0.82);
  }
}

@keyframes pm-backdrop  { from { opacity:0 } to { opacity:1 } }
@keyframes pm-slide-up  { from { transform:translateY(32px) scale(.97); opacity:0 } to { transform:translateY(0) scale(1); opacity:1 } }
@keyframes pm-pop       { 0%{transform:scale(1)} 40%{transform:scale(1.32)} 70%{transform:scale(.88)} 100%{transform:scale(1)} }
@keyframes pm-like-burst{ 0%{transform:scale(0) rotate(-15deg);opacity:1} 55%{transform:scale(1.18) rotate(4deg);opacity:1} 100%{transform:scale(1.42) rotate(0);opacity:0} }
@keyframes pm-comment-in{ from{transform:translateY(7px);opacity:0} to{transform:translateY(0);opacity:1} }
@keyframes pm-chip-in   { from{transform:translateY(4px) scale(.95);opacity:0} to{transform:translateY(0) scale(1);opacity:1} }
@keyframes pm-fade-in   { from{opacity:0} to{opacity:1} }
@keyframes pm-spin      { 0%{opacity:1} 100%{opacity:.14} }
@keyframes pm-toast     { 0%{transform:translateX(-50%) translateY(8px);opacity:0} 12%{transform:translateX(-50%) translateY(0);opacity:1} 88%{transform:translateX(-50%) translateY(0);opacity:1} 100%{transform:translateX(-50%) translateY(8px);opacity:0} }
@keyframes pm-shimmer   { from{background-position:200% 0} to{background-position:-200% 0} }
@keyframes pm-menu-in   { from{transform:scale(.94) translateY(-4px);opacity:0} to{transform:scale(1) translateY(0);opacity:1} }
@keyframes pm-delete-out{ from{transform:scaleY(1);opacity:1;max-height:200px} to{transform:scaleY(0);opacity:0;max-height:0} }
@keyframes pm-dots-blink{ 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
@keyframes pm-img-in    { from{opacity:0;transform:scale(.98)} to{opacity:1;transform:scale(1)} }

.pm-scroll::-webkit-scrollbar         { width:2px }
.pm-scroll::-webkit-scrollbar-track   { background:transparent }
.pm-scroll::-webkit-scrollbar-thumb   { background:var(--pm-scroll-th); border-radius:4px }
.pm-scroll                             { scrollbar-width:thin; scrollbar-color:var(--pm-scroll-th) transparent }

.pm-tap { transition:transform .12s cubic-bezier(.34,1.56,.64,1), opacity .12s }
.pm-tap:active { transform:scale(.86) !important; opacity:.6 }

.pm-ibtn {
  display:flex; align-items:center; justify-content:center;
  border-radius:4px; cursor:pointer;
  transition:background .14s, transform .12s cubic-bezier(.34,1.56,.64,1);
}
.pm-ibtn:hover  { background:var(--pm-ibtn-hover) }
.pm-ibtn:active { transform:scale(.88) }

.pm-comment-item:hover  .pm-comment-actions { opacity:1 }
.pm-comment-actions { opacity:0; transition:opacity .16s }
.pm-reply-row:hover .pm-reply-actions { opacity:1 }
.pm-reply-actions { opacity:0; transition:opacity .16s }

.pm-inp:focus          { outline:none; border-color:var(--pm-black) !important }
.pm-inp::placeholder   { color:var(--pm-muted) }

.pm-heart { transition:transform .28s cubic-bezier(.34,1.56,.64,1), fill .14s, color .14s }
.pm-heart.on { animation:pm-pop .35s cubic-bezier(.34,1.56,.64,1) }

.pm-ctx-menu {
  position:absolute; right:0; top:calc(100% + 5px); z-index:9999;
  background:var(--pm-menu-bg);
  border:1px solid var(--pm-border-md);
  border-radius:6px;
  overflow:hidden; min-width:152px;
  animation:pm-menu-in .14s cubic-bezier(.32,.72,0,1);
  transform-origin:top right;
  box-shadow:0 6px 28px rgba(0,0,0,.16), 0 0 0 .5px rgba(0,0,0,.06);
}
.pm-ctx-item {
  display:flex; align-items:center; gap:10px; padding:11px 15px;
  font-family:${F.body}; font-size:13px; font-weight:400; cursor:pointer;
  transition:background .1s; color:var(--pm-label);
  border-bottom:1px solid var(--pm-border);
}
.pm-ctx-item:last-child { border-bottom:none }
.pm-ctx-item:hover      { background:var(--pm-surface) }
.pm-ctx-item.danger     { color:var(--pm-red); font-weight:500 }
.pm-ctx-item.danger:hover { background:rgba(255,34,34,.08) }

.pm-skel {
  background:linear-gradient(90deg, var(--pm-skel-a) 25%, var(--pm-skel-b) 50%, var(--pm-skel-a) 75%);
  background-size:400% 100%;
  animation:pm-shimmer 1.5s ease infinite;
}

/* Dot watermark — light uses black dots, dark uses white dots */
.pm-dot-grid-light {
  position:absolute; inset:0; pointer-events:none; z-index:0; border-radius:inherit;
  background-image:radial-gradient(circle, rgba(0,0,0,1) 1px, transparent 1px);
  background-size:12px 12px;
  opacity:0.04;
}
.pm-dot-grid-dark {
  position:absolute; inset:0; pointer-events:none; z-index:0; border-radius:inherit;
  background-image:radial-gradient(circle, rgba(255,255,255,1) 1px, transparent 1px);
  background-size:12px 12px;
  opacity:0.055;
  display:none;
}
@media (prefers-color-scheme: dark) {
  .pm-dot-grid-light { display:none; }
  .pm-dot-grid-dark  { display:block; }
}

/* Dot watermark on dark media panel — always white dots */
.pm-media-dots::before {
  content:''; pointer-events:none;
  position:absolute; inset:0;
  background-image:radial-gradient(circle, var(--pm-media-dot) 1px, transparent 1px);
  background-size:12px 12px;
  border-radius:inherit;
  z-index:1;
}

.pm-comment-in { animation:pm-comment-in .22s cubic-bezier(.32,.72,0,1) both }
.pm-deleting { animation:pm-delete-out .28s cubic-bezier(.32,.72,0,1) forwards; overflow:hidden }
.pm-img-in { animation:pm-img-in .22s ease both }
`

const v = (varName: string) => `var(${varName})`

const Avatar = ({
    src, alt, size = 36, dot = false, ringRed = false,
}: { src?: string; alt: string; size?: number; dot?: boolean; ringRed?: boolean }) => (
    <div
        className="shrink-0 overflow-hidden relative"
        style={{
            width: size, height: size, minWidth: size,
            background: v("--pm-surface"),
            border: `1.5px solid ${v("--pm-border")}`,
            borderRadius: 5,
            boxShadow: ringRed ? `0 0 0 2px var(--pm-bg), 0 0 0 3.5px var(--pm-red)` : undefined,
            transition: "box-shadow .2s",
        }}
    >
        {src
            ? <img src={src} alt={alt} className="w-full h-full object-cover pm-img-in" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center">
                <UserCircle2 size={size * .55} style={{ color: v("--pm-muted") }} />
            </div>
        }
        {dot && (
            <span style={{
                position: "absolute", bottom: 1, right: 1,
                width: 7, height: 7, borderRadius: "50%",
                background: v("--pm-red"),
                border: `2px solid var(--pm-bg)`,
            }} />
        )}
    </div>
)

function timeAgo(iso: string) {
    const s = (Date.now() - new Date(iso).getTime()) / 1000
    if (s < 60) return "now"
    if (s < 3600) return `${Math.floor(s / 60)}m`
    if (s < 86400) return `${Math.floor(s / 3600)}h`
    if (s < 604800) return `${Math.floor(s / 86400)}d`
    return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" })
}

const Spinner = ({ size = 20, color = "var(--pm-muted)" }: { size?: number; color?: string }) => (
    <div className="inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
        <div className="relative" style={{ width: size, height: size }}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                <span key={i} className="absolute rounded-full"
                    style={{
                        width: size * .11, height: size * .27,
                        top: "50%", left: "50%",
                        background: color,
                        transformOrigin: `center ${size * .5}px`,
                        transform: `rotate(${i * 45}deg) translateX(-50%)`,
                        animation: `pm-spin .8s linear infinite`,
                        animationDelay: `${-(8 - i) * .1}s`,
                    }}
                />
            ))}
        </div>
    </div>
)

interface LikeBtnProps { liked: boolean; count: number; onToggle(): void; size?: "sm" | "md" | "lg" }
const LikeBtn = ({ liked, count, onToggle, size = "md" }: LikeBtnProps) => {
    const [burst, setBurst] = useState(false)
    const iconSz = size === "sm" ? 14 : size === "lg" ? 23 : 19

    const handle = () => {
        if (!liked) { setBurst(true); setTimeout(() => setBurst(false), 420) }
        onToggle()
    }

    return (
        <button onClick={handle} className="pm-tap flex items-center gap-1.5"
            style={{ color: liked ? v("--pm-red") : v("--pm-label") }}>
            <div className="relative">
                <Heart
                    size={iconSz}
                    fill={liked ? "currentColor" : "none"}
                    strokeWidth={liked ? 0 : 1.75}
                    className={`pm-heart${liked ? " on" : ""}`}
                />
                {burst && (
                    <span style={{
                        position: "absolute", inset: -5, borderRadius: "50%",
                        border: `2px solid var(--pm-red)`,
                        animation: "pm-like-burst .42s cubic-bezier(.32,.72,0,1) forwards",
                        pointerEvents: "none",
                    }} />
                )}
            </div>
            {count > 0 && (
                <span style={{
                    fontFamily: F.body,
                    fontSize: size === "sm" ? 11 : size === "lg" ? 14 : 13,
                    fontWeight: 500,
                    color: liked ? v("--pm-red") : v("--pm-sub"),
                    transition: "color .14s",
                }}>
                    {count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}
                </span>
            )}
        </button>
    )
}

const CtxMenu = ({
    onEdit, onDelete, onClose,
}: { onEdit?(): void; onDelete(): void; onClose(): void }) => {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose()
        }
        const t = setTimeout(() => document.addEventListener("mousedown", h), 10)
        return () => { clearTimeout(t); document.removeEventListener("mousedown", h) }
    }, [onClose])

    return (
        <div ref={ref} className="pm-ctx-menu">
            {onEdit && (
                <div className="pm-ctx-item" onClick={() => { onEdit(); onClose() }}>
                    <Pencil size={13} style={{ color: v("--pm-sub") }} /> Edit
                </div>
            )}
            <div className="pm-ctx-item danger" onClick={() => { onDelete(); onClose() }}>
                <Trash2 size={13} /> Delete
            </div>
        </div>
    )
}

const Toast = ({ message }: { message: string }) => (
    <div style={{
        position: "fixed", bottom: 76, left: "50%",
        background: v("--pm-toast-bg"), color: v("--pm-toast-fg"),
        borderRadius: 5, padding: "9px 16px",
        fontFamily: F.body, fontSize: 12, fontWeight: 500, letterSpacing: ".02em",
        zIndex: 9999, whiteSpace: "nowrap",
        animation: "pm-toast 2.6s ease forwards",
        pointerEvents: "none",
        border: `1px solid var(--pm-border-md)`,
        boxShadow: "0 4px 20px rgba(0,0,0,.18)",
    }}>
        {message}
    </div>
)

const CommentSkeleton = () => (
    <div className="py-3.5 flex gap-3">
        <div className="pm-skel shrink-0" style={{ width: 32, height: 32, borderRadius: 5 }} />
        <div className="flex-1 space-y-2">
            <div className="pm-skel" style={{ height: 11, width: "44%", borderRadius: 3 }} />
            <div className="pm-skel" style={{ height: 11, width: "68%", borderRadius: 3 }} />
            <div className="pm-skel" style={{ height: 9, width: "29%", borderRadius: 3, marginTop: 6 }} />
        </div>
    </div>
)

interface TreeNode extends Reply { children: TreeNode[] }

function buildTree(replies: Reply[]): TreeNode[] {
    const map = new Map<string, TreeNode>()
    replies.forEach(r => map.set(r.replyId, { ...r, children: [] }))
    const roots: TreeNode[] = []
    replies.forEach(r => {
        const node = map.get(r.replyId)!
        const pid = r._parentReplyId
        if (pid && map.has(pid)) map.get(pid)!.children.push(node)
        else roots.push(node)
    })
    return roots
}

const MAX_DEPTH = 5
const INDENT_PX = 22

interface ReplyNodeProps {
    node: TreeNode; depth: number; parentCommentId: string
    currentUserId: string | null
    editingReplyId: string | null; editReplyText: string
    onEditStart(id: string, text: string): void
    onEditCancel(): void
    onEditSave(pcid: string, rid: string): void
    onEditTextChange(t: string): void
    onLike(pcid: string, rid: string, isLiked: boolean): void
    onDelete(pcid: string, rid: string): void
    onReply(t: ReplyTarget): void
    isLast: boolean
}

const ReplyNode = (p: ReplyNodeProps) => {
    const {
        node, depth, parentCommentId, currentUserId,
        editingReplyId, editReplyText,
        onEditStart, onEditCancel, onEditSave, onEditTextChange,
        onLike, onDelete, onReply,
    } = p

    const [menuOpen, setMenuOpen] = useState(false)
    const editRef = useRef<HTMLInputElement>(null)
    const isEditing = editingReplyId === node.replyId
    const isOwner = currentUserId === node.author._id
    const hasKids = node.children.length > 0
    const effDepth = Math.min(depth, MAX_DEPTH)
    const avSize = Math.max(22, 30 - effDepth * 2)

    useEffect(() => { if (isEditing) editRef.current?.focus() }, [isEditing])

    const renderText = (text: string) => {
        if (!text.trim().startsWith("@")) return text
        const sp = text.indexOf(" ", 1)
        if (sp === -1) return <span style={{ color: v("--pm-red"), fontWeight: 500 }}>{text}</span>
        return (
            <>
                <span style={{ color: v("--pm-red"), fontWeight: 500 }}>{text.slice(0, sp)}</span>
                {text.slice(sp)}
            </>
        )
    }

    return (
        <div style={{ animation: "pm-comment-in .2s cubic-bezier(.32,.72,0,1) both" }}>
            <div className="pm-reply-row flex gap-2.5 group/reply" style={{ padding: "6px 0" }}>
                <div className="flex flex-col items-center shrink-0" style={{ paddingTop: 1 }}>
                    <Avatar src={node.profile.profilePicture} alt={node.author.username} size={Math.round(avSize)} />
                    {hasKids && (
                        <div style={{
                            flex: 1, width: 1.5, marginTop: 4, marginBottom: -4,
                            background: `linear-gradient(to bottom, var(--pm-border-md) 60%, transparent)`,
                            minHeight: 12,
                        }} />
                    )}
                </div>

                <div className="flex-1 min-w-0 pb-1">
                    {isEditing ? (
                        <div className="flex items-center gap-2 mt-0.5">
                            <input
                                ref={editRef}
                                value={editReplyText}
                                className="flex-1 pm-inp"
                                onChange={e => onEditTextChange(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === "Enter") onEditSave(parentCommentId, node.replyId)
                                    if (e.key === "Escape") onEditCancel()
                                }}
                                style={{
                                    fontFamily: F.body, fontSize: 13, color: v("--pm-label"),
                                    borderRadius: 4,
                                    background: v("--pm-input-bg"),
                                    border: `1.5px solid var(--pm-border-md)`,
                                    padding: "6px 12px",
                                    transition: "border-color .18s",
                                }}
                            />
                            <button onClick={() => onEditSave(parentCommentId, node.replyId)}
                                style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, color: v("--pm-red") }}>
                                Save
                            </button>
                            <button onClick={onEditCancel} style={{ color: v("--pm-muted") }}>
                                <X size={12} />
                            </button>
                        </div>
                    ) : (
                        <p style={{ fontFamily: F.body, fontSize: 13, color: v("--pm-label"), lineHeight: 1.55, wordBreak: "break-word" }}>
                            <span style={{ fontWeight: 700, cursor: "pointer" }} className="hover:underline">
                                {node.profile?.name || node.author.username}
                            </span>{" "}
                            {renderText(node.text)}
                        </p>
                    )}

                    {!isEditing && (
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span style={{ fontFamily: F.mono, fontSize: 10, color: v("--pm-muted"), letterSpacing: ".03em" }}>
                                {timeAgo(node.createdAt)}
                            </span>
                            {node.likesCount > 0 && (
                                <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: v("--pm-sub") }}>
                                    {node.likesCount} {node.likesCount === 1 ? "like" : "likes"}
                                </span>
                            )}
                            <button
                                onClick={() => onReply({ parentCommentId, parentReplyId: node.replyId, username: node.author.username })}
                                className="pm-tap"
                                style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: v("--pm-sub") }}>
                                Reply
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-center gap-1.5 shrink-0 pt-1">
                    <LikeBtn liked={node.isLiked} count={0} onToggle={() => onLike(parentCommentId, node.replyId, node.isLiked)} size="sm" />
                    {isOwner && !isEditing && (
                        <div className="pm-reply-actions relative">
                            <button onClick={() => setMenuOpen(o => !o)} className="pm-ibtn"
                                style={{ width: 24, height: 24, color: v("--pm-muted") }}>
                                <MoreHorizontal size={12} />
                            </button>
                            {menuOpen && (
                                <CtxMenu
                                    onEdit={() => { onEditStart(node.replyId, node.text); setMenuOpen(false) }}
                                    onDelete={() => { onDelete(parentCommentId, node.replyId); setMenuOpen(false) }}
                                    onClose={() => setMenuOpen(false)}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>

            {hasKids && (
                <div style={{ paddingLeft: effDepth < MAX_DEPTH ? INDENT_PX : 0 }}>
                    {node.children.map((child, idx) => (
                        <div key={child.replyId} className="flex">
                            <div className="shrink-0 relative" style={{ width: 18 }}>
                                <div style={{
                                    position: "absolute", top: 0, left: 5,
                                    width: 11, height: Math.round(avSize) / 2 + 10,
                                    borderLeft: `1.5px solid var(--pm-border-md)`,
                                    borderBottom: `1.5px solid var(--pm-border-md)`,
                                    borderBottomLeftRadius: 7,
                                }} />
                                {idx < node.children.length - 1 && (
                                    <div style={{
                                        position: "absolute",
                                        top: Math.round(avSize) / 2 + 10,
                                        left: 5, bottom: 0,
                                        width: 1.5, background: "var(--pm-border-md)",
                                    }} />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <ReplyNode {...p} node={child} depth={depth + 1} isLast={idx === node.children.length - 1} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
const MediaViewer = ({
    media, idx, onPrev, onNext,
}: { media: PostDetail["media"]; idx: number; onPrev(): void; onNext(): void }) => {
    const [dblLike, setDblLike] = useState(false)
    const [muted, setMuted] = useState(true)
    const videoRef = useRef<HTMLVideoElement>(null)
    const multi = media.length > 1
    const cur = media[idx]
    const isVideo = cur?.type === "video"

    // Re-mute when switching slides
    useEffect(() => { setMuted(true) }, [idx])

    // Sync muted state to video element
    useEffect(() => {
        if (videoRef.current) videoRef.current.muted = muted
    }, [muted])

    const handleDbl = () => { setDblLike(true); setTimeout(() => setDblLike(false), 1000) }

    return (
        <div
            className="pm-media-dots relative select-none"
            style={{
                width: "100%", height: "100%",
                background: v("--pm-media-bg"),
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden",
            }}
            onDoubleClick={handleDbl}
        >
            {isVideo ? (
                <video
                    ref={videoRef}
                    key={idx}
                    src={`${cur.url}#t=0.001`}
                    autoPlay muted loop playsInline
                    preload="metadata"
                    style={{
                        maxWidth: "100%", maxHeight: "100%",
                        width: "auto", height: "auto",
                        objectFit: "contain", display: "block",
                        pointerEvents: "none",
                    }}
                />
            ) : (
                <img
                    key={idx} src={cur?.url} alt="post"
                    className="pm-img-in"
                    style={{
                        maxWidth: "100%", maxHeight: "100%",
                        width: "auto", height: "auto",
                        objectFit: "contain", display: "block",
                    }}
                    draggable={false}
                />
            )}

            {dblLike && (
                <div style={{
                    position: "absolute", inset: 0, zIndex: 10,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    pointerEvents: "none",
                }}>
                    <Heart size={88} fill="white" stroke="none" style={{
                        filter: "drop-shadow(0 4px 24px rgba(0,0,0,.5))",
                        animation: "pm-pop .9s cubic-bezier(.32,.72,0,1) forwards",
                    }} />
                </div>
            )}

            {/* Mute/Unmute button — only shown for videos */}
            {isVideo && (
                <button
                    onClick={e => { e.stopPropagation(); setMuted(m => !m) }}
                    className="pm-tap absolute bottom-10 right-3 z-20 flex items-center justify-center"
                    style={{
                        width: 30, height: 30, borderRadius: 5,
                        background: "rgba(0,0,0,.48)",
                        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                        border: "1px solid rgba(255,255,255,.15)",
                    }}
                >
                    {muted
                        ? <VolumeX size={13} style={{ color: "white" }} />
                        : <Volume2 size={13} style={{ color: "white" }} />
                    }
                </button>
            )}

            {multi && idx > 0 && (
                <button onClick={onPrev} className="pm-tap absolute left-3 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center"
                    style={{
                        width: 30, height: 30, borderRadius: 5,
                        background: "rgba(255,255,255,.12)",
                        backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
                        border: "1px solid rgba(255,255,255,.2)",
                    }}>
                    <ChevronLeft size={15} style={{ color: "white" }} />
                </button>
            )}

            {multi && idx < media.length - 1 && (
                <button onClick={onNext} className="pm-tap absolute right-3 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center"
                    style={{
                        width: 30, height: 30, borderRadius: 5,
                        background: "rgba(255,255,255,.12)",
                        backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
                        border: "1px solid rgba(255,255,255,.2)",
                    }}>
                    <ChevronRight size={15} style={{ color: "white" }} />
                </button>
            )}

            {multi && (
                <div className="absolute bottom-3 flex gap-1.5 justify-center" style={{ left: 0, right: 0, zIndex: 10 }}>
                    {media.map((_, i) => (
                        <div key={i} style={{
                            height: 4, borderRadius: 2,
                            background: i === idx ? "white" : "rgba(255,255,255,.38)",
                            width: i === idx ? 18 : 4,
                            transition: "all .22s cubic-bezier(.32,.72,0,1)",
                            boxShadow: i === idx ? "0 1px 4px rgba(0,0,0,.3)" : undefined,
                        }} />
                    ))}
                </div>
            )}

            {multi && (
                <div style={{
                    position: "absolute", top: 12, right: 12, zIndex: 10,
                    background: "rgba(0,0,0,.55)",
                    backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                    border: "1px solid rgba(255,255,255,.15)",
                    borderRadius: 4, padding: "3px 9px",
                    fontFamily: F.mono, fontSize: 11, fontWeight: 500,
                    color: "rgba(255,255,255,.92)", letterSpacing: ".06em",
                }}>
                    {idx + 1}/{media.length}
                </div>
            )}
        </div>
    )
}

export default function PostModal({ postId, onClose, onDelete }: PostModalProps) {
    const [post, setPost] = useState<PostDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [meId, setMeId] = useState<string | null>(null)
    const [mediaIdx, setMediaIdx] = useState(0)
    const [liked, setLiked] = useState(false)
    const [likesCount, setLikesCount] = useState(0)
    const [saved, setSaved] = useState(false)
    const [comments, setComments] = useState<Comment[]>([])
    const [commentCursor, setCommentCursor] = useState<string | undefined>()
    const [loadingCmts, setLoadingCmts] = useState(false)
    const [input, setInput] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null)
    const [replies, setReplies] = useState<Record<string, Reply[]>>({})
    const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())
    const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({})
    const [replyCursors, setReplyCursors] = useState<Record<string, string | undefined>>({})
    const [editCid, setEditCid] = useState<string | null>(null)
    const [editCText, setEditCText] = useState("")
    const [editRid, setEditRid] = useState<string | null>(null)
    const [editRText, setEditRText] = useState("")
    const [deletingCids, setDeletingCids] = useState<Set<string>>(new Set())
    const [confirmDel, setConfirmDel] = useState(false)
    const [menuOpenCid, setMenuOpenCid] = useState<string | null>(null)
    const [toast, setToast] = useState<string | null>(null)

    const inputRef = useRef<HTMLInputElement>(null)

    const showToast = (msg: string) => {
        setToast(msg)
        setTimeout(() => setToast(null), 2700)
    }

    useEffect(() => {
        setLoading(true); setMediaIdx(0)
        const cached = postCache.get(postId)
        if (cached && Date.now() - cached.ts < CACHE_TTL) {
            setPost(cached.data); setLiked(cached.data.isLiked); setLikesCount(cached.data.likesCount)
            setLoading(false)
        }
        Promise.all([getSinglePost(postId), api.get("/profile/me")])
            .then(([pr, mr]) => {
                const p: PostDetail = pr.data.data
                postCache.set(postId, { data: p, ts: Date.now() })
                setPost(p); setLiked(p.isLiked); setLikesCount(p.likesCount)
                setMeId(mr.data.data?.user?._id ?? null)
            })
            .catch(() => onClose())
            .finally(() => setLoading(false))
    }, [postId])

    useEffect(() => {
        if (!post) return
        const cached = commentCache.get(postId)
        if (cached && Date.now() - cached.ts < CACHE_TTL) {
            setComments(cached.comments); setCommentCursor(cached.cursor); return
        }
        setLoadingCmts(true)
        getComments(postId)
            .then(res => {
                const { comments: c, nextCursor } = res.data.data
                commentCache.set(postId, { comments: c, cursor: nextCursor ?? undefined, ts: Date.now() })
                setComments(c); setCommentCursor(nextCursor ?? undefined)
            })
            .finally(() => setLoadingCmts(false))
    }, [post])

    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
            if (e.key === "ArrowRight" && post && mediaIdx < post.media.length - 1) setMediaIdx(i => i + 1)
            if (e.key === "ArrowLeft" && mediaIdx > 0) setMediaIdx(i => i - 1)
        }
        window.addEventListener("keydown", h)
        return () => window.removeEventListener("keydown", h)
    }, [onClose, post, mediaIdx])

    const handleLike = async () => {
        if (!post) return
        const was = liked
        setLiked(!was); setLikesCount(n => was ? n - 1 : n + 1)
        postCache.delete(postId)
        try { await toggleLike(post.postId, "Post") }
        catch { setLiked(was); setLikesCount(n => was ? n + 1 : n - 1) }
    }

    const handleSubmit = async () => {
        if (!input.trim() || submitting) return
        setSubmitting(true)
        const mention = replyTarget ? `@${replyTarget.username} ` : ""
        const text = input.trim().startsWith("@") ? input.trim() : mention + input.trim()
        try {
            await createComment(postId, text, replyTarget?.parentCommentId)
            setInput(""); commentCache.delete(postId)

            if (replyTarget) {
                const cid = replyTarget.parentCommentId
                const rid = replyTarget.parentReplyId
                const res = await getReplies(cid)
                const fresh: Reply[] = res.data.data.replies

                const existingIds = new Set((replies[cid] || []).map(r => r.replyId))
                const newOnes = fresh.filter(r => !existingIds.has(r.replyId))
                const tagged: Reply[] = fresh.map(r => {
                    if (rid && newOnes.some(nr => nr.replyId === r.replyId))
                        return { ...r, _parentReplyId: rid }
                    const existing = (replies[cid] || []).find(er => er.replyId === r.replyId)
                    if (existing?._parentReplyId) return { ...r, _parentReplyId: existing._parentReplyId }
                    return r
                })

                setReplies(p => ({ ...p, [cid]: tagged }))
                setExpandedReplies(p => new Set([...p, cid]))
                setComments(p => p.map(c =>
                    c.commentId === cid ? { ...c, repliesCount: c.repliesCount + 1 } : c
                ))
                setReplyTarget(null)
            } else {
                const res = await getComments(postId)
                const { comments: c, nextCursor } = res.data.data
                commentCache.set(postId, { comments: c, cursor: nextCursor ?? undefined, ts: Date.now() })
                setComments(c); setCommentCursor(nextCursor ?? undefined)
            }
        } catch { }
        finally { setSubmitting(false) }
    }

    const handleLoadMoreComments = async () => {
        if (!commentCursor) return
        setLoadingCmts(true)
        try {
            const res = await getComments(postId, commentCursor)
            const merged = [...comments, ...res.data.data.comments]
            commentCache.set(postId, { comments: merged, cursor: res.data.data.nextCursor ?? undefined, ts: Date.now() })
            setComments(merged); setCommentCursor(res.data.data.nextCursor ?? undefined)
        } finally { setLoadingCmts(false) }
    }

    const handleLoadReplies = async (cid: string, cur?: string) => {
        setLoadingReplies(p => ({ ...p, [cid]: true }))
        try {
            const res = await getReplies(cid, cur)
            const incoming: Reply[] = res.data.data.replies
            setReplies(prev => {
                const existing = prev[cid] || []
                if (cur) {
                    const exMap = new Map(existing.map(r => [r.replyId, r]))
                    const merged = [...existing]
                    incoming.forEach(r => { if (!exMap.has(r.replyId)) merged.push(r) })
                    return { ...prev, [cid]: merged }
                }
                return { ...prev, [cid]: incoming }
            })
            setExpandedReplies(p => new Set([...p, cid]))
            setReplyCursors(p => ({ ...p, [cid]: res.data.data.nextCursor ?? undefined }))
        } finally { setLoadingReplies(p => ({ ...p, [cid]: false })) }
    }

    const handleCollapseReplies = (cid: string) => {
        setExpandedReplies(p => { const s = new Set(p); s.delete(cid); return s })
    }

    const handleDeleteComment = async (cid: string) => {
        setDeletingCids(s => new Set([...s, cid]))
        setTimeout(async () => {
            setComments(p => p.filter(c => c.commentId !== cid))
            setDeletingCids(s => { const n = new Set(s); n.delete(cid); return n })
            commentCache.delete(postId)
        }, 260)
        try { await deleteComment(cid); showToast("Comment deleted") }
        catch {
            setDeletingCids(s => { const n = new Set(s); n.delete(cid); return n })
            const res = await getComments(postId); setComments(res.data.data.comments)
            showToast("Could not delete")
        }
    }

    const handleEditComment = async (cid: string) => {
        if (!editCText.trim()) return
        const prev = comments.find(c => c.commentId === cid)?.text
        const upd = comments.map(c => c.commentId === cid ? { ...c, text: editCText.trim() } : c)
        setComments(upd)
        commentCache.set(postId, { comments: upd, cursor: commentCursor, ts: Date.now() })
        setEditCid(null)
        try { await editComment(cid, editCText.trim()) }
        catch {
            if (prev) setComments(p => p.map(c => c.commentId === cid ? { ...c, text: prev } : c))
            showToast("Edit failed")
        }
    }

    const handleCommentLike = async (cid: string, isLiked: boolean) => {
        setComments(p => p.map(c =>
            c.commentId === cid
                ? { ...c, isLiked: !isLiked, likesCount: isLiked ? c.likesCount - 1 : c.likesCount + 1 }
                : c
        ))
        try { await toggleLike(cid, "Comment") }
        catch {
            setComments(p => p.map(c =>
                c.commentId === cid
                    ? { ...c, isLiked, likesCount: isLiked ? c.likesCount + 1 : c.likesCount - 1 }
                    : c
            ))
        }
    }

    const handleReplyLike = async (pcid: string, rid: string, isLiked: boolean) => {
        setReplies(p => ({
            ...p,
            [pcid]: (p[pcid] || []).map(r =>
                r.replyId === rid
                    ? { ...r, isLiked: !isLiked, likesCount: isLiked ? r.likesCount - 1 : r.likesCount + 1 }
                    : r
            ),
        }))
        try { await toggleLike(rid, "Comment") }
        catch {
            setReplies(p => ({
                ...p,
                [pcid]: (p[pcid] || []).map(r =>
                    r.replyId === rid
                        ? { ...r, isLiked, likesCount: isLiked ? r.likesCount + 1 : r.likesCount - 1 }
                        : r
                ),
            }))
        }
    }

    const handleDeleteReply = async (pcid: string, rid: string) => {
        setReplies(p => ({
            ...p,
            [pcid]: (p[pcid] || []).filter(r => r.replyId !== rid && r._parentReplyId !== rid),
        }))
        setComments(p => p.map(c =>
            c.commentId === pcid ? { ...c, repliesCount: Math.max(0, c.repliesCount - 1) } : c
        ))
        try { await deleteComment(rid); showToast("Reply deleted") }
        catch {
            const res = await getReplies(pcid)
            setReplies(p => ({ ...p, [pcid]: res.data.data.replies }))
            showToast("Delete failed")
        }
    }

    const handleEditReply = async (pcid: string, rid: string) => {
        if (!editRText.trim()) return
        const prev = (replies[pcid] || []).find(r => r.replyId === rid)?.text
        setReplies(p => ({
            ...p,
            [pcid]: (p[pcid] || []).map(r => r.replyId === rid ? { ...r, text: editRText.trim() } : r),
        }))
        setEditRid(null)
        try { await editComment(rid, editRText.trim()) }
        catch {
            if (prev) setReplies(p => ({
                ...p,
                [pcid]: (p[pcid] || []).map(r => r.replyId === rid ? { ...r, text: prev } : r),
            }))
            showToast("Edit failed")
        }
    }

    const openReply = useCallback((t: ReplyTarget) => {
        setReplyTarget(t)
        setInput(`@${t.username} `)
        setTimeout(() => {
            inputRef.current?.focus()
            const l = inputRef.current?.value.length ?? 0
            inputRef.current?.setSelectionRange(l, l)
        }, 60)
    }, [])

    const handleDeletePost = async () => {
        if (!post) return
        await deletePost(post.postId)
        postCache.delete(postId); commentCache.delete(postId)
        onDelete?.(post.postId)
    }

    if (loading && !post) return (
        <>
            <style>{GCSS}</style>
            <div
                className="fixed inset-0 z-[300] flex items-center justify-center"
                style={{
                    background: "var(--pm-overlay)",
                    backdropFilter: "blur(22px)", WebkitBackdropFilter: "blur(22px)",
                    animation: "pm-backdrop .2s ease",
                }}>
                <Spinner size={34} color="white" />
            </div>
        </>
    )
    if (!post) return null

    const isOwner = meId === post.author._id

    const rnCommon = {
        currentUserId: meId,
        editingReplyId: editRid,
        editReplyText: editRText,
        onEditStart: (id: string, txt: string) => { setEditRid(id); setEditRText(txt) },
        onEditCancel: () => setEditRid(null),
        onEditSave: handleEditReply,
        onEditTextChange: setEditRText,
        onLike: handleReplyLike,
        onDelete: handleDeleteReply,
        onReply: openReply,
    }

    return (
        <>
            <style>{GCSS}</style>
            {toast && <Toast message={toast} />}

            {/* Backdrop */}
            <div
                onClick={e => { if (e.target === e.currentTarget) onClose() }}
                className="fixed inset-0 z-[300] flex items-end md:items-center justify-center p-0 md:p-6"
                style={{
                    background: "var(--pm-overlay)",
                    backdropFilter: "blur(22px)", WebkitBackdropFilter: "blur(22px)",
                    animation: "pm-backdrop .2s ease",
                }}
            >
                {/* ── CARD ── */}
                <div
                    className="w-full flex flex-col md:flex-row overflow-hidden relative"
                    style={{
                        maxWidth: 1080,
                        height: "min(90vh, 700px)",
                        minHeight: 0,
                        borderRadius: 8,
                        background: v("--pm-bg"),
                        border: `1px solid var(--pm-border-md)`,
                        boxShadow: "0 48px 120px rgba(0,0,0,.38), 0 0 0 .5px rgba(0,0,0,.07)",
                        animation: "pm-slide-up .32s cubic-bezier(.32,.72,0,1)",
                    }}
                >
                    {/* Dot Matrix — light (CSS class handles dark:hidden) */}
                    <div className="pm-dot-grid-light" />
                    {/* Dot Matrix — dark (CSS class handles hidden dark:block) */}
                    <div className="pm-dot-grid-dark" />

                    {/* ── LEFT: MEDIA PANEL ── */}
                    <div
                        style={{
                            flex: "0 0 57%",
                            maxWidth: "57%",
                            height: "100%",
                            minHeight: 0,
                            position: "relative",
                            borderRadius: "8px 0 0 8px",
                            overflow: "hidden",
                            zIndex: 1,
                        }}
                    >
                        <MediaViewer
                            media={post.media}
                            idx={mediaIdx}
                            onPrev={() => setMediaIdx(i => i - 1)}
                            onNext={() => setMediaIdx(i => i + 1)}
                        />

                        <button
                            onClick={onClose}
                            className="pm-tap absolute top-3 left-3 z-30 flex items-center justify-center"
                            style={{
                                width: 30, height: 30, borderRadius: 5,
                                background: "rgba(0,0,0,.48)",
                                backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                                border: "1px solid rgba(255,255,255,.15)",
                            }}>
                            <X size={13} style={{ color: "white" }} />
                        </button>
                    </div>

                    {/* ── RIGHT: INFO PANEL ── */}
                    <div
                        className="flex flex-col overflow-hidden"
                        style={{
                            flex: "1 1 0",
                            minWidth: 0, minHeight: 0,
                            borderLeft: `1px solid var(--pm-border)`,
                            position: "relative",
                            zIndex: 1,
                        }}
                    >
                        {/* Header */}
                        <div
                            className="flex items-center justify-between px-4 py-3 shrink-0"
                            style={{ borderBottom: `1px solid var(--pm-border)` }}
                        >
                            <div className="flex items-center gap-3">
                                <Avatar src={post.profile.profilePicture} alt={post.author.username} size={38} dot ringRed />
                                <div>
                                    <p style={{ fontFamily: F.display, fontSize: 14, fontWeight: 700, color: v("--pm-label"), letterSpacing: "-.012em" }}>
                                        {post.profile.name || post.author.username}
                                    </p>
                                    <p style={{ fontFamily: F.mono, fontSize: 10, color: v("--pm-muted"), marginTop: 1.5, letterSpacing: ".04em" }}>
                                        @{post.author.username}
                                    </p>
                                </div>
                            </div>

                            {isOwner && (
                                !confirmDel ? (
                                    <button onClick={() => setConfirmDel(true)} className="pm-ibtn"
                                        style={{ width: 34, height: 34, color: v("--pm-sub") }}>
                                        <MoreHorizontal size={17} />
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2" style={{ animation: "pm-chip-in .18s ease" }}>
                                        <button onClick={handleDeletePost} className="pm-tap"
                                            style={{
                                                fontFamily: F.body, fontSize: 13, fontWeight: 700,
                                                color: "white", background: v("--pm-red"),
                                                borderRadius: 5, padding: "7px 14px",
                                            }}>
                                            Delete post
                                        </button>
                                        <button onClick={() => setConfirmDel(false)} className="pm-tap"
                                            style={{
                                                fontFamily: F.body, fontSize: 13, fontWeight: 600,
                                                color: v("--pm-label"), background: v("--pm-surface"),
                                                border: `1px solid var(--pm-border-md)`,
                                                borderRadius: 5, padding: "7px 14px",
                                            }}>
                                            Cancel
                                        </button>
                                    </div>
                                )
                            )}
                        </div>

                        {/* Caption */}
                        {post.caption && (
                            <div className="px-4 py-3 shrink-0" style={{ borderBottom: `1px solid var(--pm-border)` }}>
                                <p style={{ fontFamily: F.body, fontSize: 14, color: v("--pm-label"), lineHeight: 1.6, wordBreak: "break-word" }}>
                                    <span style={{ fontWeight: 700 }}>{post.profile.name || post.author.username}{" "}</span>
                                    {post.caption}
                                </p>
                                <p style={{ fontFamily: F.mono, fontSize: 10, color: v("--pm-muted"), marginTop: 5, letterSpacing: ".04em" }}>
                                    {timeAgo(post.createdAt)}
                                </p>
                            </div>
                        )}

                        {/* Comments scroll */}
                        <div className="flex-1 overflow-y-auto px-4 py-1 pm-scroll" style={{ minHeight: 0 }}>
                            {loadingCmts && comments.length === 0 && (
                                <>{[0, 1, 2].map(i => <CommentSkeleton key={i} />)}</>
                            )}

                            {!loadingCmts && comments.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-14 gap-2">
                                    <div style={{
                                        width: 52, height: 52, borderRadius: 6,
                                        background: v("--pm-surface"),
                                        border: `1px solid var(--pm-border)`,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        marginBottom: 4,
                                    }}>
                                        <MessageCircle size={22} style={{ color: v("--pm-muted") }} strokeWidth={1.5} />
                                    </div>
                                    <p style={{ fontFamily: F.display, fontSize: 15, fontWeight: 700, color: v("--pm-label") }}>No comments yet</p>
                                    <p style={{ fontFamily: F.body, fontSize: 13, color: v("--pm-muted") }}>Be the first to comment.</p>
                                </div>
                            )}

                            {comments.map((c, idx) => (
                                <div
                                    key={c.commentId}
                                    className={`pm-comment-item pm-comment-in py-3 group ${deletingCids.has(c.commentId) ? "pm-deleting" : ""}`}
                                    style={{
                                        borderBottom: idx < comments.length - 1 ? `1px solid var(--pm-border)` : "none",
                                        animationDelay: `${idx * .04}s`,
                                    }}
                                >
                                    <div className="flex gap-2.5">
                                        <Avatar src={c.profile.profilePicture} alt={c.author.username} size={34} />
                                        <div className="flex-1 min-w-0">
                                            {editCid === c.commentId ? (
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <input
                                                        autoFocus value={editCText}
                                                        onChange={e => setEditCText(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === "Enter") handleEditComment(c.commentId)
                                                            if (e.key === "Escape") setEditCid(null)
                                                        }}
                                                        className="flex-1 pm-inp"
                                                        style={{
                                                            fontFamily: F.body, fontSize: 14, color: v("--pm-label"),
                                                            borderRadius: 4, background: v("--pm-input-bg"),
                                                            border: `1.5px solid var(--pm-border-md)`,
                                                            padding: "7px 12px", transition: "border-color .18s",
                                                        }}
                                                    />
                                                    <button onClick={() => handleEditComment(c.commentId)}
                                                        style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: v("--pm-red") }}>
                                                        Save
                                                    </button>
                                                    <button onClick={() => setEditCid(null)} style={{ color: v("--pm-muted") }}>
                                                        <X size={13} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <p style={{ fontFamily: F.body, fontSize: 14, color: v("--pm-label"), lineHeight: 1.55, wordBreak: "break-word" }}>
                                                    <span style={{ fontWeight: 700, cursor: "pointer" }} className="hover:underline">
                                                        {c.profile?.name || c.author.username}
                                                    </span>{" "}
                                                    {c.text}
                                                </p>
                                            )}

                                            {editCid !== c.commentId && (
                                                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                                    <span style={{ fontFamily: F.mono, fontSize: 11, color: v("--pm-muted"), letterSpacing: ".03em" }}>
                                                        {timeAgo(c.createdAt)}
                                                    </span>
                                                    {c.likesCount > 0 && (
                                                        <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: v("--pm-sub") }}>
                                                            {c.likesCount} {c.likesCount === 1 ? "like" : "likes"}
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => openReply({ parentCommentId: c.commentId, username: c.author.username })}
                                                        className="pm-tap"
                                                        style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: v("--pm-sub") }}>
                                                        Reply
                                                    </button>
                                                </div>
                                            )}

                                            {c.repliesCount > 0 && (
                                                <div className="mt-2">
                                                    {!expandedReplies.has(c.commentId) ? (
                                                        <button onClick={() => handleLoadReplies(c.commentId)}
                                                            className="pm-tap flex items-center gap-2"
                                                            style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: v("--pm-sub") }}>
                                                            {loadingReplies[c.commentId] ? (
                                                                <><Spinner size={12} color="var(--pm-muted)" /><span>Loading…</span></>
                                                            ) : (
                                                                <>
                                                                    <div style={{ width: 22, height: 1.5, background: "var(--pm-border-md)" }} />
                                                                    View {c.repliesCount} {c.repliesCount === 1 ? "reply" : "replies"}
                                                                </>
                                                            )}
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => handleCollapseReplies(c.commentId)}
                                                            className="pm-tap flex items-center gap-2 mb-1"
                                                            style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: v("--pm-sub") }}>
                                                            <div style={{ width: 22, height: 1.5, background: "var(--pm-border-md)" }} />
                                                            Hide replies
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {expandedReplies.has(c.commentId) && replies[c.commentId] && (
                                                <div className="mt-2.5 space-y-0">
                                                    {buildTree(replies[c.commentId]).map((node, ni, arr) => (
                                                        <ReplyNode
                                                            key={node.replyId}
                                                            node={node} depth={0}
                                                            parentCommentId={c.commentId}
                                                            isLast={ni === arr.length - 1}
                                                            {...rnCommon}
                                                        />
                                                    ))}
                                                    {replyCursors[c.commentId] && (
                                                        <button
                                                            onClick={() => handleLoadReplies(c.commentId, replyCursors[c.commentId])}
                                                            className="pm-tap flex items-center gap-2 mt-1 pl-1"
                                                            style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: v("--pm-sub") }}>
                                                            {loadingReplies[c.commentId] ? (
                                                                <><Spinner size={12} color="var(--pm-muted)" /><span>Loading…</span></>
                                                            ) : (
                                                                <>
                                                                    <div style={{ width: 18, height: 1.5, background: "var(--pm-border-md)" }} />
                                                                    Load more replies
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="shrink-0 flex flex-col items-center gap-1.5 pt-0.5">
                                            <LikeBtn liked={c.isLiked} count={0} onToggle={() => handleCommentLike(c.commentId, c.isLiked)} size="sm" />
                                            {meId === c.author._id && (
                                                <div className="pm-comment-actions relative">
                                                    <button
                                                        onClick={() => setMenuOpenCid(menuOpenCid === c.commentId ? null : c.commentId)}
                                                        className="pm-ibtn"
                                                        style={{ width: 26, height: 26, color: v("--pm-muted") }}>
                                                        <MoreHorizontal size={13} />
                                                    </button>
                                                    {menuOpenCid === c.commentId && (
                                                        <CtxMenu
                                                            onEdit={() => { setEditCid(c.commentId); setEditCText(c.text); setMenuOpenCid(null) }}
                                                            onDelete={() => { handleDeleteComment(c.commentId); setMenuOpenCid(null) }}
                                                            onClose={() => setMenuOpenCid(null)}
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {commentCursor && (
                                <button onClick={handleLoadMoreComments} disabled={loadingCmts}
                                    className="pm-tap w-full py-3.5 flex items-center justify-center gap-2"
                                    style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: v("--pm-sub") }}>
                                    {loadingCmts
                                        ? <><Spinner size={14} color="var(--pm-muted)" /><span>Loading…</span></>
                                        : "Load more comments"
                                    }
                                </button>
                            )}
                        </div>

                        {/* Actions bar */}
                        <div className="px-4 py-3 shrink-0" style={{ borderTop: `1px solid var(--pm-border)` }}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <LikeBtn liked={liked} count={likesCount} onToggle={handleLike} size="lg" />
                                    <button
                                        onClick={() => setTimeout(() => inputRef.current?.focus(), 50)}
                                        className="pm-tap flex items-center gap-1.5"
                                        style={{ color: v("--pm-label") }}>
                                        <MessageCircle size={22} strokeWidth={1.75} />
                                        {post.commentsCount > 0 && (
                                            <span style={{ fontFamily: F.body, fontSize: 14, fontWeight: 500, color: v("--pm-sub") }}>
                                                {post.commentsCount}
                                            </span>
                                        )}
                                    </button>
                                    <button className="pm-tap" style={{ color: v("--pm-label") }}
                                        onClick={() => { navigator.clipboard?.writeText(window.location.href); showToast("Link copied") }}>
                                        <Share2 size={21} strokeWidth={1.75} />
                                    </button>
                                </div>
                                <button onClick={() => setSaved(s => !s)} className="pm-tap" style={{ color: v("--pm-label") }}>
                                    <Bookmark size={21} strokeWidth={1.75} fill={saved ? v("--pm-label") : "none"} />
                                </button>
                            </div>

                            {likesCount > 0 && (
                                <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: v("--pm-label"), marginTop: 8 }}>
                                    {likesCount.toLocaleString()} {likesCount === 1 ? "like" : "likes"}
                                </p>
                            )}
                            {!post.caption && (
                                <p style={{ fontFamily: F.mono, fontSize: 9.5, color: v("--pm-muted"), marginTop: 4, letterSpacing: ".05em", textTransform: "uppercase" }}>
                                    {timeAgo(post.createdAt)}
                                </p>
                            )}
                        </div>

                        {/* Comment input */}
                        <div className="px-4 pb-5 pt-2.5 shrink-0" style={{ borderTop: `1px solid var(--pm-border)` }}>
                            {replyTarget && (
                                <div
                                    className="flex items-center justify-between mb-2 px-3 py-1.5"
                                    style={{
                                        borderRadius: 5,
                                        background: v("--pm-reply-chip"),
                                        border: `1px solid var(--pm-border)`,
                                        animation: "pm-chip-in .18s cubic-bezier(.32,.72,0,1)",
                                    }}
                                >
                                    <span style={{ fontFamily: F.body, fontSize: 12, color: v("--pm-sub") }}>
                                        Replying to{" "}
                                        <span style={{ fontWeight: 700, color: v("--pm-red") }}>@{replyTarget.username}</span>
                                    </span>
                                    <button onClick={() => { setReplyTarget(null); setInput("") }} className="pm-tap ml-2" style={{ color: v("--pm-muted") }}>
                                        <X size={12} />
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center gap-2.5">
                                <div
                                    className="flex-1 flex items-center gap-1"
                                    style={{
                                        borderRadius: 5,
                                        background: v("--pm-input-bg"),
                                        border: `1.5px solid var(--pm-border-md)`,
                                        padding: "0 6px 0 13px",
                                        transition: "border-color .18s, box-shadow .18s",
                                    }}
                                >
                                    <input
                                        ref={inputRef}
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSubmit()}
                                        placeholder={replyTarget ? "Add a reply…" : "Add a comment…"}
                                        className="flex-1 bg-transparent pm-inp"
                                        style={{ fontFamily: F.body, fontSize: 14, color: v("--pm-label"), border: "none", outline: "none", padding: "10px 0" }}
                                    />
                                    <button className="pm-ibtn shrink-0 p-1.5" style={{ color: v("--pm-muted"), borderRadius: 4 }}>
                                        <Smile size={17} />
                                    </button>
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    disabled={!input.trim() || submitting}
                                    className="pm-tap flex items-center justify-center shrink-0 disabled:opacity-35"
                                    style={{
                                        width: 38, height: 38, borderRadius: 5,
                                        background: input.trim() ? v("--pm-black") : v("--pm-surface"),
                                        border: `1.5px solid ${input.trim() ? "var(--pm-black)" : "var(--pm-border-md)"}`,
                                        transition: "background .18s, border-color .18s",
                                    }}>
                                    {submitting
                                        ? <Spinner size={16} color={input.trim() ? "white" : "var(--pm-muted)"} />
                                        : <Send size={14} style={{ color: input.trim() ? "white" : v("--pm-muted"), transform: "translateX(1px)" }} />
                                    }
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </>
    )
}