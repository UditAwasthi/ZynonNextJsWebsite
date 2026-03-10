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

// POST /chat/message — { threadId, content }
export const sendMessage = (threadId: string, content: string) =>
    api.post(`/chat/message`, { threadId, content })

// POST /chat/message/seen — { threadId, messageIds }
export const markMessagesSeen = (threadId: string, messageIds: string[]) =>
    api.post(`/chat/message/seen`, { threadId, messageIds })

// POST /chat/reaction — { messageId, emoji }
export const addReaction = (messageId: string, emoji: string) =>
    api.post(`/chat/reaction`, { messageId, emoji })