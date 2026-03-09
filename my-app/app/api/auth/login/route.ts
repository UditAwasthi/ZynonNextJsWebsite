// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";

// Use a private env var — not NEXT_PUBLIC_ (that leaks to the browser bundle)
const BASE_URL = process.env.API_BASE_URL || "https://zynon.onrender.com/api/";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const backendRes = await fetch(`${BASE_URL}auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    // No credentials: "include" — this is a server-to-server call, cookies don't apply
  });

  const data = await backendRes.json();

  if (!backendRes.ok) {
    return NextResponse.json(data, { status: backendRes.status });
  }

  const response = NextResponse.json(data, { status: 200 });

  // --- Strategy 1: refreshToken is in the response body ---
  const refreshTokenFromBody = data.data?.refreshToken;

  // --- Strategy 2: refreshToken came as a Set-Cookie from the backend ---
  // Forward it ourselves as an HttpOnly cookie on the Next.js domain
  const setCookieHeader = backendRes.headers.get("set-cookie");

  const refreshToken = refreshTokenFromBody ?? extractTokenFromCookieHeader(setCookieHeader);

  if (refreshToken) {
    const isProduction = process.env.NODE_ENV === "production";

    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProduction,           // Must be false in localhost (http)
      sameSite: isProduction ? "none" : "lax", // "none" only works with secure:true
      path: "/",
      maxAge: 60 * 60 * 24 * 7,      // 7 days
    });
  }

  return response;
}

// Pulls the token value out of a raw Set-Cookie string like:
// "refreshToken=abc123; Path=/; HttpOnly; SameSite=None"
function extractTokenFromCookieHeader(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/refreshToken=([^;]+)/);
  return match ? match[1] : null;
}