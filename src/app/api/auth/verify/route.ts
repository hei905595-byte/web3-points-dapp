import { verifyMessage } from "ethers";
import { NextRequest, NextResponse } from "next/server";
import { createSessionToken } from "@/lib/session-token";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { address, signature } = (await request.json()) as {
      address?: string;
      signature?: string;
    };
    const nonce = request.cookies.get("orbit_nonce")?.value;

    if (!address || !signature || !nonce) {
      return NextResponse.json(
        { error: "The login request has expired. Please try again." },
        { status: 400 },
      );
    }

    const message = `Orbit Points\n\nWallet: ${address}\nNonce: ${nonce}`;
    const recoveredAddress = verifyMessage(message, signature);
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json(
        { error: "The signature does not match the wallet address." },
        { status: 401 },
      );
    }

    const now = Date.now();
    const token = createSessionToken({
      address: recoveredAddress,
      issuedAt: now,
      expiresAt: now + 7 * 24 * 60 * 60 * 1000,
    });
    const response = NextResponse.json({ address: recoveredAddress });
    response.cookies.set("orbit_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });
    response.cookies.delete("orbit_nonce");
    return response;
  } catch {
    return NextResponse.json(
      { error: "The wallet signature could not be verified." },
      { status: 401 },
    );
  }
}
