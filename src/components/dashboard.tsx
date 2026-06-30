"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Flame,
  Gift,
  LockKeyhole,
  Medal,
  Rocket,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  createEmptyProfile,
  pointsApi,
  type PointTask,
  type PointsProfile,
} from "@/lib/points-api";
import {
  requestWalletAddress,
  signWalletMessage,
  shortenAddress,
  waitForWalletProvider,
} from "@/lib/wallet";
import type { WalletKind, WalletProvider } from "@/types/wallet";
import { VerifyModal } from "./verify-modal";
import { WalletModal } from "./wallet-modal";

interface LeaderboardMember {
  name: string;
  points: number;
  color: string;
  current?: boolean;
}

const taskIcons: Record<string, LucideIcon> = {
  "daily-check-in": CheckCircle2,
  "daily-tasks": Zap,
  "invite-friends": Users,
  "view-leaderboard": Trophy,
};

const previewTasks: PointTask[] = [
  {
    id: "daily-check-in",
    title: "Daily Check-in",
    description: "Connect your wallet and claim today's points.",
    category: "Daily Check-in",
    reward: 25,
    completed: false,
  },
  {
    id: "daily-tasks",
    title: "Complete Daily Tasks",
    description: "Finish simple community actions to grow your balance.",
    category: "Daily Tasks",
    reward: 80,
    completed: false,
  },
  {
    id: "invite-friends",
    title: "Invite Friends",
    description: "Share your invite link and earn when friends join.",
    category: "Community",
    reward: 120,
    completed: false,
  },
  {
    id: "view-leaderboard",
    title: "View Leaderboard",
    description: "Check the season ranking and compare your progress.",
    category: "Leaderboard",
    reward: 15,
    completed: false,
  },
];

// Reserved for a future wallet-balance eligibility check.
function checkAddressBalance() {}

export function Dashboard() {
  const suiteLinks = [
    {
      key: "points",
      label: "积分中心",
      href:
        process.env.NEXT_PUBLIC_POINTS_URL ||
        "https://web3-points-dapp.vercel.app/",
    },
    {
      key: "query",
      label: "双链查询",
      href:
        process.env.NEXT_PUBLIC_QUERY_URL ||
        "https://heibai-dual-chain-query.vercel.app/",
    },
    {
      key: "guard",
      label: "安全检测",
      href:
        process.env.NEXT_PUBLIC_GUARD_URL ||
        "https://heibai-address-guard.vercel.app/",
    },
  ];
  const [address, setAddress] = useState("");
  const [profile, setProfile] = useState<PointsProfile | null>(null);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [walletBusy, setWalletBusy] = useState<WalletKind | null>(null);
  const [actionBusy, setActionBusy] = useState("");
  const [error, setError] = useState("");
  const [uiReady, setUiReady] = useState(false);
  const [network, setNetwork] = useState("OFFLINE");
  const [chainWriteEnabled, setChainWriteEnabled] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardMember[]>([]);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [showFullLeaderboard, setShowFullLeaderboard] = useState(false);
  const walletProviders = useRef<
    Partial<Record<WalletKind, WalletProvider>>
  >({});

  function openVerifyModal() {
    setVerifyModalOpen(true);
  }

  function scrollToSection(sectionId: string) {
    if (typeof window === "undefined") return;
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  useEffect(() => {
    pointsApi.health().then((health) => {
      setNetwork(health.chainReadConfigured ? health.network : "OFFLINE");
      setChainWriteEnabled(health.chainWriteConfigured);
    }).catch(() => {
      setNetwork("OFFLINE");
      setChainWriteEnabled(false);
    });
  }, []);

  useEffect(() => {
    const timer =
      typeof window !== "undefined"
        ? window.setTimeout(() => setUiReady(true), 450)
        : undefined;

    return () => {
      if (typeof window !== "undefined" && timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initializeWallets = async () => {
      try {
        const [tronlink, tokenpocket] = await Promise.all([
          waitForWalletProvider("tronlink"),
          waitForWalletProvider("tokenpocket"),
        ]);

        if (cancelled) return;
        if (tronlink) walletProviders.current.tronlink = tronlink;
        if (tokenpocket) walletProviders.current.tokenpocket = tokenpocket;
      } catch {
        // A wallet injection failure must not block the dashboard UI.
      }
    };

    const timer =
      typeof window !== "undefined"
        ? window.setTimeout(initializeWallets, 600)
        : undefined;

    return () => {
      cancelled = true;
      if (typeof window !== "undefined" && timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  useEffect(() => {
    if (!address) return;

    let active = true;
    pointsApi
      .getProfile(address)
      .then((data) => {
        if (active) setProfile(data);
      })
      .catch((caught) => {
        if (active) {
          setProfile(createEmptyProfile());
          setError(
            caught instanceof Error
              ? caught.message
              : "Points data is temporarily unavailable.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [address]);

  useEffect(() => {
    let active = true;
    pointsApi
      .getLeaderboard(20)
      .then((members) => {
        if (!active) return;
        setLeaderboard(
          members.map((member, index) => ({
            name: shortenAddress(member.address),
            points: member.points,
            color: ["#2563eb", "#16a34a", "#f59e0b", "#db2777", "#0ea5e9"][
              index % 5
            ],
          })),
        );
      })
      .catch(() => {
        if (active) setLeaderboard([]);
      });
    return () => {
      active = false;
    };
  }, [profile?.balance]);

  const connectWallet = async (kind: WalletKind) => {
    setError("");
    setWalletBusy(kind);

    try {
      const provider =
        walletProviders.current[kind] ??
        (await waitForWalletProvider(kind));

      if (!provider) {
        setError(
          `${kind === "tronlink" ? "TronLink" : "TokenPocket"} was not detected. Open this page inside the wallet browser and try again.`,
        );
        return;
      }

      walletProviders.current[kind] = provider;
      const nextAddress = await requestWalletAddress(kind, provider);

      if (!nextAddress) {
        setError("No wallet account is available.");
        return;
      }

      try {
        const challenge = await pointsApi.getChallenge(nextAddress);
        const signature = await signWalletMessage(provider, challenge.message);
        const session = await pointsApi.verifyLogin(
          nextAddress,
          challenge.nonce,
          signature,
        );
        pointsApi.setSession(session.token);
        setAddress(nextAddress);
        checkAddressBalance();
        setNetwork((current) => current === "OFFLINE" ? "TRON" : current);

        setWalletModalOpen(false);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Signature request was declined.",
        );
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Wallet connection failed. Please try again.",
      );
    } finally {
      setWalletBusy(null);
    }
  };

  const disconnect = () => {
    setAddress("");
    setProfile(null);
    setError("");
    pointsApi.setSession("");
    setNetwork("OFFLINE");
  };

  const runTask = async (taskId: string) => {
    if (!address) {
      setWalletModalOpen(true);
      return;
    }
    if (!chainWriteEnabled) {
      setError("Nile contract writes are paused until the administrator signer is configured.");
      return;
    }

    setActionBusy(taskId);
    try {
      setProfile(await pointsApi.completeTask(address, taskId));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The task could not be updated. Please try again.",
      );
    } finally {
      setActionBusy("");
    }
  };

  const isConnected = Boolean(address);
  const tasks = isConnected && profile?.tasks.length ? profile.tasks : previewTasks;
  const visibleTasks = showAllTasks ? tasks : tasks.slice(0, 4);
  const completedTasks = isConnected
    ? profile?.tasks.filter((task) => task.completed).length ?? 0
    : 0;
  const availableTasks = tasks.filter((task) => !task.completed).length;
  const pointBalance = isConnected ? profile?.balance ?? 0 : 0;
  const streak = isConnected ? profile?.streak ?? 0 : 0;
  const rank = isConnected ? profile?.rank ?? 0 : 0;
  const isLoading = !uiReady || Boolean(walletBusy) || (isConnected && !profile);
  const leaderboardMembers: LeaderboardMember[] = [
    ...leaderboard,
    {
      name: "You",
      points: pointBalance,
      color: "#2563eb",
      current: true,
    },
  ];
  const visibleLeaderboardMembers = showFullLeaderboard
    ? leaderboardMembers
    : leaderboardMembers.length > 4
      ? [
          ...leaderboardMembers.slice(0, 3),
          leaderboardMembers[leaderboardMembers.length - 1],
        ]
      : leaderboardMembers;

  return (
    <div className="points-app">
      <header className="points-header">
        <a className="points-brand" href="#dashboard" aria-label="Orbit Points">
          <span>OP</span>
          <strong>Orbit Points</strong>
        </a>
        {isConnected ? (
          <button className="points-wallet connected" onClick={disconnect}>
            <span />
            {shortenAddress(address)}
          </button>
        ) : (
          <button
            className="points-wallet"
            onClick={() => setWalletModalOpen(true)}
          >
            <Wallet aria-hidden="true" />
            Connect
          </button>
        )}
      </header>

      <nav className="points-suite-nav" aria-label="产品导航">
        {suiteLinks.map((link) => (
          <a
            className={link.key === "points" ? "active" : undefined}
            href={link.href}
            aria-current={link.key === "points" ? "page" : undefined}
            key={link.key}
          >
            {link.label}
          </a>
        ))}
      </nav>

      <main className="points-main" id="dashboard">
        <section className="points-hero">
          <div className="points-hero-copy">
            <span className="points-kicker">Season 1 Rewards</span>
            <h1>Earn points every day.</h1>
            <p>
              Complete tasks, invite friends, and climb the leaderboard with a
              connected wallet.
            </p>
          </div>

          <div className="points-balance-card">
            <span className="points-balance-label">My Points</span>
            <strong>{pointBalance.toLocaleString()}</strong>
            <div className="points-balance-meta">
              <span>
                <Flame aria-hidden="true" />
                {streak} day streak
              </span>
              <span>
                <Medal aria-hidden="true" />
                {rank ? `#${rank}` : "Unranked"}
              </span>
            </div>
          </div>

          <div className="points-hero-actions">
            <button
              className="points-primary"
              disabled={isConnected && !chainWriteEnabled}
              onClick={() =>
                isConnected ? runTask("daily-check-in") : setWalletModalOpen(true)
              }
            >
              <CheckCircle2 aria-hidden="true" />
              {isConnected ? "Daily Check-in" : "Connect to Start"}
            </button>
            <button
              className="points-secondary"
              onClick={() => scrollToSection("daily-tasks")}
            >
              View Tasks
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </section>

        {error && (
          <section className="points-error" aria-live="polite">
            {error}
          </section>
        )}

        <section className="points-quick-grid" aria-label="Progress summary">
          <article>
            <span>Completed</span>
            <strong>{completedTasks}</strong>
            <small>Tasks done</small>
          </article>
          <article>
            <span>Available</span>
            <strong>{availableTasks}</strong>
            <small>Tasks open</small>
          </article>
          <article>
            <span>Network</span>
            <strong>{network}</strong>
            <small>{isConnected ? (chainWriteEnabled ? "Wallet active" : "Read only") : "Ready"}</small>
          </article>
        </section>

        <section className="points-panel" id="daily-tasks">
          <div className="points-section-head">
            <div>
              <span>Tasks</span>
              <h2>Earn More Points</h2>
            </div>
            <button onClick={() => setShowAllTasks((current) => !current)}>
              {showAllTasks ? "Less" : "All"}
            </button>
          </div>

          <div className="points-task-list">
            {visibleTasks.map((task) => {
              const status = task.completed
                ? "completed"
                : isConnected
                  ? "available"
                  : "locked";
              const TaskIcon = taskIcons[task.id] ?? Rocket;

              return (
                <article className={`points-task ${status}`} key={task.id}>
                  <span className="points-task-icon">
                    <TaskIcon aria-hidden="true" />
                  </span>
                  <div className="points-task-copy">
                    <span>{task.category}</span>
                    <h3>{task.title}</h3>
                    <p>{task.description}</p>
                  </div>
                  <div className="points-task-action">
                    <strong>+{task.reward}</strong>
                    <button
                      disabled={task.completed || actionBusy === task.id || (isConnected && !chainWriteEnabled)}
                      onClick={() => runTask(task.id)}
                    >
                      {task.completed ? (
                        <Check aria-hidden="true" />
                      ) : status === "locked" ? (
                        <LockKeyhole aria-hidden="true" />
                      ) : (
                        <Zap aria-hidden="true" />
                      )}
                      {task.completed
                        ? "Done"
                        : actionBusy === task.id
                          ? "..."
                          : status === "locked"
                            ? "Connect"
                            : "Start"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="points-invite" id="invite-friends">
          <span className="points-invite-icon">
            <Gift aria-hidden="true" />
          </span>
          <div>
            <span>Bonus</span>
            <h2>Invite friends, earn more.</h2>
            <p>Share your invite link and grow your season position.</p>
          </div>
          <button onClick={openVerifyModal}>
            Invite
            <ArrowUpRight aria-hidden="true" />
          </button>
        </section>

        <section className="points-panel" id="leaderboard">
          <div className="points-section-head">
            <div>
              <span>Leaderboard</span>
              <h2>Top Contributors</h2>
            </div>
            <button onClick={() => setShowFullLeaderboard((current) => !current)}>
              {showFullLeaderboard ? "Top" : "Full"}
            </button>
          </div>

          <div className="points-leaderboard">
            {visibleLeaderboardMembers.map((member, index) => {
              const position = leaderboardMembers.findIndex(
                (entry) => entry.name === member.name,
              );

              return (
                <div
                  className={member.current ? "current-user" : ""}
                  key={`${member.name}-${index}`}
                >
                  <span className="points-rank">
                    {position < 3 ? <Trophy aria-hidden="true" /> : position + 1}
                  </span>
                  <span
                    className="points-avatar"
                    style={{ "--avatar": member.color } as React.CSSProperties}
                  >
                    {member.name.charAt(0)}
                  </span>
                  <span className="points-member">
                    <strong>{member.name}</strong>
                    <small>
                      {member.current ? "Your account" : `Rank ${position + 1}`}
                    </small>
                  </span>
                  <strong className="points-member-points">
                    {member.points.toLocaleString()}
                  </strong>
                </div>
              );
            })}
          </div>
        </section>

        <footer className="points-footer" id="profile">
          <CircleUserRound aria-hidden="true" />
          <div>
            <strong>Points track participation.</strong>
            <small>
              Eligibility, reward rules, and future benefits will be announced
              separately.
            </small>
          </div>
          <button onClick={openVerifyModal}>
            Profile
            <UserPlus aria-hidden="true" />
          </button>
        </footer>
      </main>

      <WalletModal
        busy={walletBusy}
        error={error}
        onClose={() => {
          if (!walletBusy) setWalletModalOpen(false);
        }}
        onConnect={connectWallet}
        open={walletModalOpen}
      />
      <VerifyModal
        address={address}
        open={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        onUpdated={() => {
          if (address) {
            pointsApi.getProfile(address).then(setProfile).catch(() => {});
          }
        }}
      />
    </div>
  );
}
