import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("nexo_user_id", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return response;
}
