// lib/api/search.ts
import api from "./api"

export interface SearchUser {
    _id: string
    username: string
    name: string
    profilePicture?: string
}

export interface SearchPost {
    _id: string
    caption: string
    author: {
        _id: string
        username: string
    }
}

export interface SearchResults {
    users: SearchUser[]
    posts: SearchPost[]
}

export async function fetchSuggestions(q: string): Promise<SearchUser[]> {
    if (q.length < 2) return []
    const res = await api.get(`/search/suggestions?q=${encodeURIComponent(q)}`)
    return res.data.data as SearchUser[]
}

export async function fetchSearchResults(q: string): Promise<SearchResults> {
    const res = await api.get(`/search?q=${encodeURIComponent(q)}`)
    return res.data.data as SearchResults
}