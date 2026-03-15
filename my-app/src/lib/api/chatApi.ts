import api from "./api"

// ── Threads ───────────────────────────────────────────────────────────────────

// POST /chat/thread/dm — { receiverId }
export const createOrGetDMThread = (receiverId: string) =>
    api.post(`/chat/thread/dm`, { receiverId })

// POST /chat/thread/group — { name, members: string[] }
export const createGroupThread = (name: string, members: string[]) =>
    api.post(`/chat/thread/group`, { name, members })

// POST /chat/thread/add-member — { threadId, memberId }
export const addMember = (threadId: string, memberId: string) =>
    api.post(`/chat/thread/add-member`, { threadId, memberId })

// POST /chat/thread/remove-member — { threadId, memberId }
export const removeMember = (threadId: string, memberId: string) =>
    api.post(`/chat/thread/remove-member`, { threadId, memberId })

// GET /chat/inbox?cursor=&limit=20
export const getInbox = (cursor?: string, limit = 20) =>
    api.get(`/chat/inbox`, { params: { cursor, limit } })

// GET /chat/unread-counts
export const getUnreadCounts = () =>
    api.get(`/chat/unread-counts`)

// ── Messages ──────────────────────────────────────────────────────────────────

// GET /chat/messages/:threadId?cursor=&limit=30
export const getMessages = (threadId: string, cursor?: string, limit = 30) =>
    api.get(`/chat/messages/${threadId}`, { params: { cursor, limit } })

// POST /chat/message — flexible payload
// ChatThread calls: sendMessage(threadId, { content?, replyTo?, attachments?, postId? })
export const sendMessage = (
    threadId: string,
    payload: {
        content?: string
        replyTo?: string
        attachments?: { url: string; type: string; meta?: object }[]
        postId?: string
    }
) => api.post(`/chat/message`, { threadId, ...payload })

// POST /chat/message/seen — { threadId, messageIds }
export const markMessagesSeen = (threadId: string, messageIds: string[]) =>
    api.post(`/chat/message/seen`, { threadId, messageIds })

// POST /chat/reaction — { messageId, emoji }
export const addReaction = (messageId: string, emoji: string) =>
    api.post(`/chat/reaction`, { messageId, emoji })

// DELETE /chat/message — { messageId } in body (backend reads req.body.messageId)
export const deleteMessage = (messageId: string) =>
    api.delete(`/chat/message`, { data: { messageId } })

// PATCH /chat/message — { messageId, content } in body (backend reads req.body)
export const editMessage = (messageId: string, content: string) =>
    api.patch(`/chat/message`, { messageId, content })

// POST /chat/message/forward — { messageId, threadId }
export const forwardMessage = (messageId: string, threadId: string) =>
    api.post(`/chat/message/forward`, { messageId: String(messageId), threadId: String(threadId) })

// POST /chat/message/pin — { messageId }
export const pinMessage = (messageId: string) =>
    api.post(`/chat/message/pin`, { messageId })

// ── Media upload ──────────────────────────────────────────────────────────────

// GET /chat/media/signature — get Cloudinary upload signature
export const getChatUploadSignature = () =>
    api.get(`/chat/media/signature`)

export const uploadChatMedia = async (
    file: File,
    onProgress?: (pct: number) => void
): Promise<{ url: string; type: "image" | "video" | "audio" | "file"; meta: object }> => {
    const sigRes = await getChatUploadSignature()
    const { timestamp, signature, apiKey, cloudName, folder } = sigRes.data.data

    const formData = new FormData()
    formData.append("file", file)
    formData.append("timestamp", timestamp)
    formData.append("signature", signature)
    formData.append("api_key", apiKey)
    formData.append("folder", folder)

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open("POST", uploadUrl)

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && onProgress) {
                onProgress(Math.round((e.loaded / e.total) * 100))
            }
        }

        xhr.onload = () => {
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText)
                const type = deriveMediaType(file.type)
                const meta: Record<string, number> = { size: data.bytes }
                if (data.width)    meta.width    = data.width
                if (data.height)   meta.height   = data.height
                if (data.duration) meta.duration = data.duration
                resolve({ url: data.secure_url, type, meta })
            } else {
                reject(new Error("Cloudinary upload failed"))
            }
        }

        xhr.onerror = () => reject(new Error("Upload network error"))
        xhr.send(formData)
    })
}

const deriveMediaType = (mimeType: string): "image" | "video" | "audio" | "file" => {
    if (mimeType.startsWith("image/")) return "image"
    if (mimeType.startsWith("video/")) return "video"
    if (mimeType.startsWith("audio/")) return "audio"
    return "file"
}