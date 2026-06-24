import { createHmac, timingSafeEqual } from "node:crypto";

export interface SessionPayload {
  address: string;
  issuedAt: number;
  expiresAt: number;
}

const DEV_SECRET = "nova-points-local-development-secret-change-me";

function secret() {
  return process.env.SESSION_SECRET || DEV_SECRET;
}

function signature(encodedPayload: string) {
  return createHmac("sha256", secret())
    .update(encodedPayload)
    .digest("base64url");
}

export function createSessionToken(payload: SessionPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  return `${encodedPayload}.${signature(encodedPayload)}`;
}

export function verifySessionToken(token?: string): SessionPayload | null {
  if (!token) return null;
  const [encodedPayload, suppliedSignature] = token.split(".");
  if (!encodedPayload || !suppliedSignature) return null;

  const expected = Buffer.from(signature(encodedPayload));
  const supplied = Buffer.from(suppliedSignature);
  if (
    expected.length !== supplied.length ||
    !timingSafeEqual(expected, supplied)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString(),
    ) as SessionPayload;
    if (!payload.address || payload.expiresAt <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
