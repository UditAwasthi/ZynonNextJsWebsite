import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // Clear the refreshToken cookie at the Next.js layer
  response.cookies.set("refreshToken", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });

  return response;
}