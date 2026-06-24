import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  const nonce = randomBytes(16).toString("hex");
  const response = NextResponse.json({ nonce });
  response.cookies.set("orbit_nonce", nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 5,
    path: "/",
  });
  return response;
}
