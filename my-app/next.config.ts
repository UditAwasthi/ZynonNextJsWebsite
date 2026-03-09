import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    serverExternalPackages: ["axios"], // 👈 moved out of experimental
    trailingSlash: false,
}

export default nextConfig;