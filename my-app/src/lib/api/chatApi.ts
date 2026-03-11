import api from "./api"

// POST /chat/thread/dm — { receiverId }
export const createOrGetDMThread = (receiverId: string) =>
    api.post(`/chat/thread/dm`, { receiverId })

// GET /chat/inbox?cursor=&limit=20
export const getInbox = (cursor?: string, limit = 20) =>
    api.get(`/chat/inbox`, { params: { cursor, limit } })

// GET /chat/messages/:threadId?cursor=&limit=30
export const getMessages = (threadId: string, cursor?: string, limit = 30) =>
    api.get(`/chat/messages/${threadId}`, { params: { cursor, limit } })

// POST /chat/message — { threadId, content, mediaUrl?, mediaType?, mediaMeta? }
export const sendMessage = (
    threadId: string,
    content: string,
    media?: { mediaUrl: string; mediaType: string; mediaMeta?: object }
) =>
    api.post(`/chat/message`, { threadId, content, ...media })

// POST /chat/message/seen — { threadId, messageIds }
export const markMessagesSeen = (threadId: string, messageIds: string[]) =>
    api.post(`/chat/message/seen`, { threadId, messageIds })

// POST /chat/reaction — { messageId, emoji }
export const addReaction = (messageId: string, emoji: string) =>
    api.post(`/chat/reaction`, { messageId, emoji })

// GET /chat/media/signature — get Cloudinary upload signature
export const getChatUploadSignature = () =>
    api.get(`/chat/media/signature`)

// Upload a file directly to Cloudinary using the signed params
export const uploadChatMedia = async (
    file: File,
    onProgress?: (pct: number) => void
): Promise<{ url: string; mediaType: "image" | "video" | "audio" | "file"; mediaMeta: object }> => {
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
                const mediaType = deriveMediaType(file.type)
                const mediaMeta: Record<string, number> = { size: data.bytes }
                if (data.width) mediaMeta.width = data.width
                if (data.height) mediaMeta.height = data.height
                if (data.duration) mediaMeta.duration = data.duration
                resolve({ url: data.secure_url, mediaType, mediaMeta })
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