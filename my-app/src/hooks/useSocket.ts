"use client";

// useSocket.ts
// Returns the singleton socket instance for the given token.
// The socket is created lazily in getSocket() and reused — this hook
// just exposes it and starts a periodic heartbeat to keep the online
// Redis key alive (matches the 60s EX set by the backend).

import { useEffect, useRef } from "react";
import { type Socket } from "socket.io-client";
import { getSocket } from "../lib/socket";

const HEARTBEAT_INTERVAL_MS = 25_000; // every 25s — safely under the 60s TTL

export const useSocket = (token: string): Socket | null => {
    // Initialise synchronously so callers never get null on first render
    const socketRef = useRef<Socket | null>(token ? getSocket(token) : null);

    useEffect(() => {
        if (!token) return;

        socketRef.current = getSocket(token);
        const socket = socketRef.current;

        // Heartbeat: keep user:online and user:socket Redis keys alive
        const interval = setInterval(() => {
            if (socket.connected) socket.emit("heartbeat");
        }, HEARTBEAT_INTERVAL_MS);

        return () => {
            clearInterval(interval);
            // Do NOT disconnect — the socket is a singleton shared across the app
        };
    }, [token]);

    return socketRef.current;
};