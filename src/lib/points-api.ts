export interface PointTask {
  id: string;
  title: string;
  description: string;
  category:
    | "Daily Check-in"
    | "Daily Tasks"
    | "Community"
    | "Leaderboard";
  reward: number;
  completed: boolean;
  verification?: "automatic" | "external";
}

export interface PointsProfile {
  address?: string;
  balance: number;
  streak: number;
  rank: number;
  inviter?: string | null;
  inviteRebate?: number;
  tasks: PointTask[];
}

export interface LeaderboardMember {
  rank: number;
  address: string;
  points: number;
}

function gatewayUrl() {
  if (process.env.NEXT_PUBLIC_GATEWAY_URL) {
    return process.env.NEXT_PUBLIC_GATEWAY_URL.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    if (/^(localhost|127\.0\.0\.1|192\.168\.|10\.)/.test(window.location.hostname)) {
      return `${window.location.protocol}//${window.location.hostname}:8787`;
    }
    return "https://api.hbnest.pw/points-api";
  }
  return "http://localhost:8787";
}

let sessionToken = "";

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${gatewayUrl()}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(sessionToken
          ? { Authorization: `Bearer ${sessionToken}` }
          : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new Error(
      "Cannot reach the Orbit gateway. Check that the backend is running and accessible from this device.",
    );
  }
  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data as T;
}

export const pointsApi = {
  health() {
    return request<{ ok: boolean; network: string; chainReadConfigured: boolean; chainWriteConfigured: boolean }>("/health");
  },
  setSession(token: string) {
    sessionToken = token;
  },
  getChallenge(address: string) {
    return request<{
      address: string;
      nonce: string;
      message: string;
    }>("/auth/challenge", {
      method: "POST",
      body: JSON.stringify({ address }),
    });
  },
  verifyLogin(address: string, nonce: string, signature: string) {
    return request<{ token: string; expiresIn: number }>("/auth/verify", {
      method: "POST",
      body: JSON.stringify({ address, nonce, signature }),
    });
  },
  getProfile(address: string) {
    return request<PointsProfile>(
      `/profile/${encodeURIComponent(address)}`,
    );
  },
  async completeTask(address: string, taskId: string) {
    const result = await request<{
      txid: string;
      profile: PointsProfile;
    }>(`/tasks/${encodeURIComponent(taskId)}/complete`, {
      method: "POST",
      body: JSON.stringify({ address }),
    });
    return result.profile;
  },
  async getLeaderboard(limit = 20) {
    const result = await request<{ members: LeaderboardMember[] }>(
      `/leaderboard?limit=${limit}`,
    );
    return result.members;
  },
  createInviteCode() {
    return request<{ code: string }>("/invites/code", {
      method: "POST",
      body: "{}",
    });
  },
  bindInvite(code: string) {
    return request<{ txid: string; parent: string }>("/invites/bind", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  },
};

export function createEmptyProfile(): PointsProfile {
  return { balance: 0, streak: 0, rank: 0, tasks: [] };
}
