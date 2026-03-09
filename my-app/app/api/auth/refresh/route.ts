import { NextRequest, NextResponse } from "next/server";

const BASE_URL = process.env.API_BASE_URL || "https://zynon.onrender.com/api";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get("refreshToken")?.value;

  if (!refreshToken) {
    return NextResponse.json({ message: "No refresh token found" }, { status: 401 });
  }

  const backendRes = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Send it as a cookie header to the backend, exactly as it expects
      "Cookie": `refreshToken=${refreshToken}`,
    },
  });

  const data = await backendRes.json();

  if (!backendRes.ok) {
    return NextResponse.json(data, { status: backendRes.status });
  }

  // If backend rotates the refresh token, re-set the new one
  const setCookieHeader = backendRes.headers.get("set-cookie");
  const response = NextResponse.json(data, { status: 200 });

  if (setCookieHeader) {
    const match = setCookieHeader.match(/refreshToken=([^;]+)/);
    const newRefreshToken = match?.[1];

    if (newRefreshToken) {
      const isProduction = process.env.NODE_ENV === "production";
      response.cookies.set("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    }
  }

  return response;
}