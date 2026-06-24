export interface PointActivity {
  id: string;
  title: string;
  points: number;
  timestamp: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  reward: number;
  icon: string;
  claimed: boolean;
}

export interface PointsProfile {
  balance: number;
  streak: number;
  rank: number;
  checkedInToday: boolean;
  quests: Quest[];
  activity: PointActivity[];
}

const wait = (duration = 320) =>
  new Promise((resolve) => setTimeout(resolve, duration));

const today = () => new Date().toISOString().slice(0, 10);

function key(address: string) {
  return `nova-points:${address.toLowerCase()}`;
}

function initialProfile(): PointsProfile {
  return {
    balance: 1280,
    streak: 3,
    rank: 842,
    checkedInToday: false,
    quests: [
      {
        id: "connect",
        title: "完成钱包登录",
        description: "使用支持的钱包完成一次签名登录",
        reward: 100,
        icon: "⌁",
        claimed: true,
      },
      {
        id: "explore",
        title: "探索 Nova 生态",
        description: "浏览项目功能，解锁新手探索奖励",
        reward: 180,
        icon: "✦",
        claimed: false,
      },
      {
        id: "community",
        title: "加入社区",
        description: "完成社区身份验证并领取贡献积分",
        reward: 250,
        icon: "◎",
        claimed: false,
      },
    ],
    activity: [
      {
        id: "welcome",
        title: "新用户欢迎奖励",
        points: 1000,
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: "wallet",
        title: "钱包登录任务",
        points: 100,
        timestamp: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: "bonus",
        title: "早期体验加成",
        points: 180,
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
      },
    ],
  };
}

function read(address: string): PointsProfile {
  const raw = localStorage.getItem(key(address));
  if (!raw) {
    const profile = initialProfile();
    localStorage.setItem(key(address), JSON.stringify(profile));
    return profile;
  }

  return JSON.parse(raw) as PointsProfile;
}

function write(address: string, profile: PointsProfile) {
  localStorage.setItem(key(address), JSON.stringify(profile));
}

export const pointsApi = {
  async getProfile(address: string) {
    await wait();
    return read(address);
  },

  async checkIn(address: string) {
    await wait(520);
    const profile = read(address);
    const checkInKey = `${key(address)}:checkin`;
    if (localStorage.getItem(checkInKey) === today()) {
      return profile;
    }

    const reward = 60;
    const next = {
      ...profile,
      balance: profile.balance + reward,
      streak: profile.streak + 1,
      checkedInToday: true,
      activity: [
        {
          id: crypto.randomUUID(),
          title: "每日签到",
          points: reward,
          timestamp: new Date().toISOString(),
        },
        ...profile.activity,
      ],
    };
    write(address, next);
    localStorage.setItem(checkInKey, today());
    return next;
  },

  async claimQuest(address: string, questId: string) {
    await wait(520);
    const profile = read(address);
    const quest = profile.quests.find((item) => item.id === questId);
    if (!quest || quest.claimed) return profile;

    const next = {
      ...profile,
      balance: profile.balance + quest.reward,
      quests: profile.quests.map((item) =>
        item.id === questId ? { ...item, claimed: true } : item,
      ),
      activity: [
        {
          id: crypto.randomUUID(),
          title: quest.title,
          points: quest.reward,
          timestamp: new Date().toISOString(),
        },
        ...profile.activity,
      ],
    };
    write(address, next);
    return next;
  },
};
