import api from "./api";

export interface FeedPost {
    _id: string;
    author: {
        _id: string;
        username: string;
        profilePicture?: string;
    };
    caption?: string;
    media: {
        url: string;
        type: "image" | "video";
        width?: number;
        height?: number;
    }[];
    likesCount: number;
    commentsCount: number;
    visibility: "public" | "private";
    createdAt: string;
}


// GET /feed/home?cursor=
// res.data.data → FeedPost[]
export const getHomeFeed = (cursor?: string) =>
    api.get<{ data: FeedPost[] }>("/feed/home", {
        params: cursor ? { cursor } : undefined,
    });

// GET /feed/reels?cursor=
// res.data.data → { reels: FeedPost[], nextCursor: string | null }
export const getReelsFeed = (cursor?: string) =>
    api.get<{ data: { reels: FeedPost[]; nextCursor: string | null } }>("/feed/reels", {
        params: cursor ? { cursor } : undefined,
    });

// GET /feed/explore?cursor=
// res.data.data → FeedPost[]
export const getExploreFeed = (cursor?: string) =>
    api.get<{ data: FeedPost[] }>("/feed/explore", {
        params: cursor ? { cursor } : undefined,
    });