import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/session-token";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("orbit_session")?.value;
  const session = verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    address: session.address,
    expiresAt: session.expiresAt,
  });
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.delete("orbit_session");
  return response;
}
