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
}

export interface PointsProfile {
  balance: number;
  streak: number;
  rank: number;
  tasks: PointTask[];
}

const wait = (duration = 280) =>
  new Promise((resolve) => setTimeout(resolve, duration));

function storageKey(address: string) {
  return `orbit-points:${address.toLowerCase()}`;
}

export function createInitialProfile(): PointsProfile {
  return {
    balance: 1280,
    streak: 3,
    rank: 842,
    tasks: [
      {
        id: "daily-check-in",
        title: "Daily Check-in",
        description: "Return each day and keep your Daily Streak active.",
        category: "Daily Check-in",
        reward: 60,
        completed: false,
      },
      {
        id: "daily-tasks",
        title: "Complete Daily Tasks",
        description: "Complete today's activity list and grow your Points.",
        category: "Daily Tasks",
        reward: 120,
        completed: false,
      },
      {
        id: "invite-friends",
        title: "Invite Friends",
        description: "Invite friends to discover Orbit Points together.",
        category: "Community",
        reward: 180,
        completed: false,
      },
      {
        id: "view-leaderboard",
        title: "View Leaderboard",
        description: "Check the latest rankings and compare your progress.",
        category: "Leaderboard",
        reward: 40,
        completed: false,
      },
    ],
  };
}

function read(address: string): PointsProfile {
  if (typeof window === "undefined") return createInitialProfile();

  try {
    const raw = window.localStorage.getItem(storageKey(address));
    if (!raw) {
      const profile = createInitialProfile();
      window.localStorage.setItem(storageKey(address), JSON.stringify(profile));
      return profile;
    }

    const stored = JSON.parse(raw) as PointsProfile;
    const initial = createInitialProfile();
    const storedTasks = new Map(
      (stored.tasks ?? []).map((task) => [task.id, task]),
    );

    return {
      ...initial,
      ...stored,
      tasks: initial.tasks.map((task) => ({
        ...task,
        completed: storedTasks.get(task.id)?.completed ?? false,
      })),
    };
  } catch {
    return createInitialProfile();
  }
}

function write(address: string, profile: PointsProfile) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey(address), JSON.stringify(profile));
  } catch {
    // Local mock persistence is optional and must not interrupt the UI.
  }
}

export const pointsApi = {
  async getProfile(address: string) {
    await wait();
    return read(address);
  },

  async checkIn(address: string) {
    await wait();
    const profile = read(address);
    const task = profile.tasks.find((item) => item.id === "daily-check-in");
    if (!task || task.completed) return profile;

    const next = {
      ...profile,
      balance: profile.balance + task.reward,
      streak: profile.streak + 1,
      tasks: profile.tasks.map((item) =>
        item.id === task.id ? { ...item, completed: true } : item,
      ),
    };
    write(address, next);
    return next;
  },

  async completeTask(address: string, taskId: string) {
    await wait();
    const profile = read(address);
    const task = profile.tasks.find((item) => item.id === taskId);
    if (!task || task.completed) return profile;

    const next = {
      ...profile,
      balance: profile.balance + task.reward,
      tasks: profile.tasks.map((item) =>
        item.id === taskId ? { ...item, completed: true } : item,
      ),
    };
    write(address, next);
    return next;
  },
};
