// lib/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let currentToken: string = "";

export const getSocket = (token: string): Socket => {
    if (!token) throw new Error("Token is empty");

    // If token changed, disconnect old socket and create fresh one
    if (socket && currentToken !== token) {
        socket.disconnect();
        socket = null;
    }

    if (!socket) {
        currentToken = token;
        const url = process.env.NEXT_PUBLIC_SOCKET_URL!;
        console.log("Connecting socket to:", url);

        socket = io(url, {
            auth: { token },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            // transports: ["polling"],
            withCredentials: true,
        });

        socket.on("connect", () => console.log("✅ Socket connected:", socket?.id));
        socket.on("disconnect", (reason) => console.log("❌ Socket disconnected:", reason));
        socket.on("connect_error", (err) => console.error("🔴 Socket error:", err.message));
    }

    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
        currentToken = "";
    }
};