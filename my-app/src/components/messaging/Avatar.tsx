"use client";

import { useState } from "react";
import { Users } from "lucide-react";

interface AvatarProps {
    src?: string | null;
    name: string;
    size?: number;
    isGroup?: boolean;
    className?: string;
}

export function Avatar({ src, name, size = 40, isGroup = false, className = "" }: AvatarProps) {
    const [imgError, setImgError] = useState(false);
    const initial = name?.[0]?.toUpperCase() ?? "?";
    const fontSize = Math.round(size * 0.36);
    const iconSize = Math.round(size * 0.4);

    if (src && !imgError) {
        return (
            <img
                src={src}
                alt={name}
                onError={() => setImgError(true)}
                className={`rounded-full object-cover flex-shrink-0 ${className}`}
                style={{ width: size, height: size }}
            />
        );
    }

    return (
        <div
            className={`rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 flex items-center justify-center flex-shrink-0 ${className}`}
            style={{ width: size, height: size }}
        >
            {isGroup
                ? <Users size={iconSize} className="text-zinc-500 dark:text-zinc-400" />
                : <span className="font-semibold text-zinc-500 dark:text-zinc-300" style={{ fontSize }}>{initial}</span>
            }
        </div>
    );
}