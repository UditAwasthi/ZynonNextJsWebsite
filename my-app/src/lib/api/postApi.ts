import api from "./api"

// GET /user/:userId/posts?cursor=&limit=12
export const getUserPosts = (userId: string, cursor?: string, limit = 12) =>
    api.get(`/content/user/${userId}/posts`, { params: { cursor, limit } })

// GET /posts/:postId
export const getSinglePost = (postId: string) =>
    api.get(`/content/posts/${postId}`)

// DELETE /posts/:postId
export const deletePost = (postId: string) =>
    api.delete(`/content/posts/${postId}`)

// POST /posts/likes/toggle — { targetId, targetType: "Post" | "Comment" }
export const toggleLike = (targetId: string, targetType: "Post" | "Comment") =>
    api.post(`/content/posts/likes/toggle`, { targetId, targetType })

// GET /posts/:postId/comments?cursor=&limit=12
export const getComments = (postId: string, cursor?: string, limit = 12) =>
    api.get(`/content/posts/${postId}/comments`, { params: { cursor, limit } })

// POST /posts/:postId/comments — { text, parentComment? }
export const createComment = (postId: string, text: string, parentComment?: string) =>
    api.post(`/content/posts/${postId}/comments`, { text, parentComment })

// GET /comments/:commentId/replies?cursor=&limit=10
export const getReplies = (commentId: string, cursor?: string, limit = 10) =>
    api.get(`/content/comments/${commentId}/replies`, { params: { cursor, limit } })

// DELETE /comments/:commentId
export const deleteComment = (commentId: string) =>
    api.delete(`/content/comments/${commentId}`)

// PATCH /comments/:commentId — { text }
export const editComment = (commentId: string, text: string) =>
    api.patch(`/content/comments/${commentId}`, { text })