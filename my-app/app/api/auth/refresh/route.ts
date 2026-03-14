import { NextRequest, NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE || "https://zynon.onrender.com/api/";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get("refreshToken")?.value;
  if (!refreshToken) {
    return NextResponse.json({ message: "No refresh token found" }, { status: 401 });
  }

  try {
    const backendRes = await fetch(`${BASE_URL}auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": `refreshToken=${refreshToken}`,
      },
    });

    const data = await backendRes.json();

    // Fix 1: removed duplicate !backendRes.ok check
    if (!backendRes.ok) {
      return NextResponse.json(data, { status: backendRes.status });
    }

    const response = NextResponse.json(data, { status: 200 });

    // Fix 2: use getSetCookie() (returns string[]) instead of brittle regex on get("set-cookie")
    const setCookieHeaders = backendRes.headers.getSetCookie();
    const rtCookie = setCookieHeaders.find((c) => c.startsWith("refreshToken="));

    if (rtCookie) {
      const newRefreshToken = rtCookie.split(";")[0].split("=")[1];

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
  } catch (err) {
    // Backend unreachable (cold start, network) — don't wipe the session
    return NextResponse.json(
      { message: "Upstream unavailable" },
      { status: 503 }
    );
  }
}