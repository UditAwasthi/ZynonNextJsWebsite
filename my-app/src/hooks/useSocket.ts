// hooks/useSocket.ts
import { useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { getSocket } from "../lib/socket";

export const useSocket = (token: string) => {
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        socketRef.current = getSocket(token);
        return () => {};  // don't disconnect on unmount — socket is singleton
    }, [token]);

    return socketRef.current;
};