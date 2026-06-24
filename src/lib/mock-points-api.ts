export interface PointTask {
  id: string;
  title: string;
  description: string;
  category: "Daily Check-in" | "Daily Tasks" | "Bonus Tasks";
  reward: number;
  icon: string;
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
        icon: "✓",
        completed: false,
      },
      {
        id: "daily-tasks",
        title: "Complete Daily Tasks",
        description: "Review today’s Tasks and update your Points progress.",
        category: "Daily Tasks",
        reward: 120,
        icon: "◇",
        completed: false,
      },
      {
        id: "bonus-tasks",
        title: "Explore Bonus Tasks",
        description: "Open the Bonus Tasks section and review available Rewards.",
        category: "Bonus Tasks",
        reward: 180,
        icon: "✦",
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

    return JSON.parse(raw) as PointsProfile;
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
