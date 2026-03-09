import api from "./api"

// POST /:userId/follow
// 201 { success, message: "User followed successfully" | "Follow request sent" }
export const followUser = (userId: string) =>
    api.post(`/follow/${userId}/follow`)

// DELETE /:userId/unfollow
// 200 { success, message: "User unfollowed successfully" }
export const unfollowUser = (userId: string) =>
    api.delete(`/follow/${userId}/unfollow`)

// DELETE /:userId/cancel-request
// 200 { success, message: "Follow request cancelled" }
export const cancelFollowRequest = (userId: string) =>
    api.delete(`/follow/${userId}/cancel-request`)

// POST /:userId/accept
// 200 { success, message: "Follow request accepted" }
export const acceptFollowRequest = (userId: string) =>
    api.post(`/follow/${userId}/accept`)

// POST /:userId/reject
// 200 { success, message: "Follow request rejected" }
export const rejectFollowRequest = (userId: string) =>
    api.post(`/follow/${userId}/reject`)

// GET /:userId/followers  (no auth required)
// 200 { success, data: [{ _id, follower: { _id, username } }] }
export const getFollowers = (userId: string) =>
    api.get(`/follow/${userId}/followers`)

// GET /:userId/following  (no auth required)
// 200 { success, data: [{ _id, following: { _id, username } }] }
export const getFollowing = (userId: string) =>
    api.get(`/follow/${userId}/following`)

// GET /:userId/status  (auth required)
// 200 { success, data: { status: "following" | "requested" | "not_following" } }
export const getFollowStatus = (userId: string) =>
    api.get(`/follow/${userId}/status`)

// GET /requests  (auth required)
// 200 { success, data: [{ _id, follower: { _id, username } }] }
export const getFollowRequests = () =>
    api.get("/follow/requests")