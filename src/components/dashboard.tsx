"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Flame,
  Gift,
  Grid2X2,
  LockKeyhole,
  Medal,
  Orbit,
  PartyPopper,
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
  createInitialProfile,
  pointsApi,
  type PointsProfile,
} from "@/lib/mock-points-api";
import {
  requestWalletAddress,
  signWalletLogin,
  shortenAddress,
  waitForWalletProvider,
} from "@/lib/wallet";
import type { WalletKind, WalletProvider } from "@/types/wallet";
import { VerifyModal } from "./verify-modal";
import { WalletModal } from "./wallet-modal";

const navigation: Array<{
  label: string;
  href: string;
  icon: LucideIcon;
}> = [
  { label: "Dashboard", href: "#dashboard", icon: Grid2X2 },
  { label: "Daily Tasks", href: "#daily-tasks", icon: CheckCircle2 },
  { label: "Bonus Tasks", href: "#bonus-tasks", icon: Sparkles },
  { label: "Leaderboard", href: "#leaderboard", icon: BarChart3 },
  { label: "Invite Friends", href: "#invite-friends", icon: UserPlus },
  { label: "Profile", href: "#profile", icon: CircleUserRound },
];

interface LeaderboardMember {
  name: string;
  points: number;
  color: string;
  current?: boolean;
}

const leaderboard: LeaderboardMember[] = [
  { name: "Alex Morgan", points: 12840, color: "#8b5cf6" },
  { name: "Mia Chen", points: 11290, color: "#ec4899" },
  { name: "Noah Williams", points: 9840, color: "#06b6d4" },
  { name: "Sofia Lee", points: 8650, color: "#f59e0b" },
  { name: "Ethan Park", points: 7920, color: "#10b981" },
];

const taskIcons: Record<string, LucideIcon> = {
  "daily-check-in": CheckCircle2,
  "daily-tasks": Zap,
  "invite-friends": Users,
  "view-leaderboard": Trophy,
};

function checkAddressBalance() {}

export function Dashboard() {
  const [address, setAddress] = useState("");
  const [profile, setProfile] = useState<PointsProfile | null>(null);
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [walletBusy, setWalletBusy] = useState<WalletKind | null>(null);
  const [actionBusy, setActionBusy] = useState("");
  const [error, setError] = useState("");
  const [uiReady, setUiReady] = useState(false);
  const [network, setNetwork] = useState<"ETH" | "TRON" | "—">("—");
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
        const [metamask, tokenpocket] = await Promise.all([
          waitForWalletProvider("metamask"),
          waitForWalletProvider("tokenpocket"),
        ]);

        if (cancelled) return;
        if (metamask) walletProviders.current.metamask = metamask;
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
      .catch(() => {
        if (active) setProfile(createInitialProfile());
      });

    return () => {
      active = false;
    };
  }, [address]);

  const connectWallet = async (kind: WalletKind) => {
    setError("");
    setWalletBusy(kind);

    try {
      const provider =
        walletProviders.current[kind] ??
        (await waitForWalletProvider(kind));

      if (!provider) {
        setError(
          `${kind === "metamask" ? "MetaMask" : "TokenPocket"} was not detected. Open this page inside the wallet browser and try again.`,
        );
        return;
      }

      walletProviders.current[kind] = provider;
      const nextAddress = await requestWalletAddress(kind, provider);

      if (!nextAddress) {
        setError("No wallet account is available.");
        return;
      }

      setAddress(nextAddress);
      setNetwork(
        kind === "tokenpocket" &&
          typeof window !== "undefined" &&
          !window.ethereum &&
          Boolean(window.tronWeb)
          ? "TRON"
          : "ETH",
      );
      try {
        const signResult = await signWalletLogin(kind, provider, nextAddress);
        checkAddressBalance();

        if (signResult === "unsupported") {
          setError("Signing is not supported in the current wallet environment.");
          return;
        }

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
    setNetwork("—");
  };

  const runTask = async (taskId: string) => {
    if (!address) {
      setWalletModalOpen(true);
      return;
    }

    setActionBusy(taskId);
    try {
      if (taskId === "daily-check-in") {
        setProfile(await pointsApi.checkIn(address));
      } else {
        setProfile(await pointsApi.completeTask(address, taskId));
      }
    } catch {
      setError("The task could not be updated. Please try again.");
    } finally {
      setActionBusy("");
    }
  };

  const isConnected = Boolean(address);
  const stats: Array<{
    label: string;
    value: string;
    detail: string;
    hint: string;
    trend: string;
    icon: LucideIcon;
    accent: "purple" | "blue" | "green" | "orange";
  }> = [
    {
      label: "Total Points",
      value: isConnected ? (profile?.balance ?? 0).toLocaleString() : "0",
      detail: "Lifetime points earned",
      hint: isConnected ? "Across all completed tasks" : "Connect to sync activity",
      trend: isConnected ? "↑ 8.4%" : "—",
      icon: Sparkles,
      accent: "purple",
    },
    {
      label: "Tasks Completed",
      value: isConnected
        ? String(profile?.tasks.filter((task) => task.completed).length ?? 0)
        : "0",
      detail: "Tasks completed",
      hint: isConnected ? "Keep your momentum going" : "No activity recorded yet",
      trend: isConnected ? "↑ 2" : "—",
      icon: CheckCircle2,
      accent: "blue",
    },
    {
      label: "Daily Streak",
      value: isConnected ? String(profile?.streak ?? 0) : "0",
      detail: "Consecutive active days",
      hint: isConnected ? "Check in again tomorrow" : "Start your first streak",
      trend: isConnected ? "↑ 1 day" : "—",
      icon: Flame,
      accent: "green",
    },
    {
      label: "Rank",
      value: isConnected ? `#${profile?.rank ?? 0}` : "0",
      detail: "Community position",
      hint: isConnected ? "Based on total points" : "Ranking unavailable",
      trend: isConnected ? "↑ 14" : "—",
      icon: Medal,
      accent: "orange",
    },
  ];
  const tasks = profile?.tasks ?? createInitialProfile().tasks;
  const visibleTasks = showAllTasks ? tasks : tasks.slice(0, 3);
  const isLoading = !uiReady || Boolean(walletBusy) || (isConnected && !profile);
  const leaderboardMembers: LeaderboardMember[] = [
    ...leaderboard,
    {
      name: "You",
      points: isConnected ? (profile?.balance ?? 0) : 0,
      color: "#a78bfa",
      current: true,
    },
  ];
  const visibleLeaderboardMembers = showFullLeaderboard
    ? leaderboardMembers
    : [
        ...leaderboardMembers.slice(0, 3),
        leaderboardMembers[leaderboardMembers.length - 1],
      ];

  return (
    <div className="orbit-app">
      <aside className="sidebar">
        <a className="sidebar-brand" href="#dashboard" aria-label="Orbit Points">
          <span className="orbit-logo">
            <span />
          </span>
          <span>
            <strong>Orbit</strong>
            <small>Points</small>
          </span>
        </a>

        <nav className="sidebar-nav" aria-label="Orbit Points navigation">
          {navigation.map((item) => (
            <a
              className={activeSection === item.label ? "active" : ""}
              href={item.href}
              key={item.label}
              onClick={() => setActiveSection(item.label)}
            >
              <item.icon aria-hidden="true" />
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="sidebar-card">
          <span className="sidebar-card-icon">
            <Orbit aria-hidden="true" />
          </span>
          <strong>Orbit Points</strong>
          <p>Complete community tasks and track your progress.</p>
          <button onClick={openVerifyModal}>View Profile</button>
        </div>
      </aside>

      <div className="app-content">
        <header className="top-header">
          <div>
            <span className="mobile-brand-mark">O</span>
            <h1>Orbit Points</h1>
          </div>
          {isConnected ? (
            <div className="wallet-account">
              <button className="wallet-button connected" onClick={disconnect}>
                <span className="connection-dot" />
                {shortenAddress(address)}
              </button>
              <div className="wallet-preview">
                <span className="wallet-preview-icon">
                  <Wallet aria-hidden="true" />
                </span>
                <div>
                  <small>Connected wallet</small>
                  <strong>{shortenAddress(address)}</strong>
                  <span>{network} network · Online</span>
                </div>
              </div>
            </div>
          ) : (
            <button
              className="wallet-button"
              onClick={() => setWalletModalOpen(true)}
            >
              <Wallet aria-hidden="true" />
              Connect Wallet
            </button>
          )}
        </header>

        <main className="dashboard-main" id="dashboard">
          <section className="action-guide" aria-label="Getting started">
            <span className="action-guide-icon">
              <PartyPopper aria-hidden="true" />
            </span>
            <div>
              <strong>
                {isConnected
                  ? "Your Orbit is active"
                  : "Web3 community points, tasks, and shared progress"}
              </strong>
              <small>
                {isConnected
                  ? "Choose an available task below to earn your next points."
                  : "Connect a wallet, complete community activities, and build your ranking."}
              </small>
            </div>
            <button
              onClick={() =>
                isConnected
                  ? scrollToSection("daily-tasks")
                  : setWalletModalOpen(true)
              }
            >
              {isConnected ? "View Tasks" : "Get Started"}
              <ChevronRight aria-hidden="true" />
            </button>
          </section>

          <section
            className={`hero-card glass-card ${isLoading ? "is-loading" : ""}`}
          >
            <div className="hero-copy">
              <span className="eyebrow">ORBIT POINTS DASHBOARD</span>
              <h2>Welcome to your Orbit</h2>
              <p>Track Points, complete Tasks, and view your Rank.</p>
              <div className="hero-actions">
                <button
                  className="hero-primary-action"
                  onClick={() =>
                    isConnected
                      ? scrollToSection("daily-tasks")
                      : setWalletModalOpen(true)
                  }
                >
                  {isConnected ? "Start a Task" : "Connect to Start"}
                  <ArrowUpRight aria-hidden="true" />
                </button>
                <button
                  className="hero-secondary-action"
                  onClick={() => scrollToSection("leaderboard")}
                >
                  Explore Rankings
                </button>
              </div>
              <div className="hero-tags">
                <span className={`identity-tag ${isConnected ? "online" : ""}`}>
                  <CircleUserRound aria-hidden="true" />
                  {isConnected ? shortenAddress(address) : "Guest"}
                </span>
                <span className="network-tag">
                  <Activity aria-hidden="true" />
                  {network} Network
                </span>
                <span className="season-chip">
                  <span />
                  Rewards active
                </span>
              </div>
              <div className="hero-mini-stats">
                <div>
                  <small>Available tasks</small>
                  <strong>{tasks.filter((task) => !task.completed).length}</strong>
                </div>
                <div>
                  <small>Season progress</small>
                  <strong>{isConnected ? "32%" : "0%"}</strong>
                </div>
                <div>
                  <small>Next refresh</small>
                  <strong>18h</strong>
                </div>
              </div>
            </div>
            <div className="hero-visual" aria-hidden="true">
              <span className="hero-planet" />
              <span className="hero-orbit hero-orbit-one" />
              <span className="hero-orbit hero-orbit-two" />
              <span className="hero-star hero-star-one" />
              <span className="hero-star hero-star-two" />
            </div>
          </section>

          <section
            className={`platform-intro glass-card ${
              isConnected ? "compact" : ""
            }`}
            aria-label="About Orbit Points"
          >
            <div className="platform-intro-icon">
              <Orbit aria-hidden="true" />
            </div>
            <div>
              <span className="eyebrow">WHAT IS ORBIT POINTS?</span>
              {isConnected ? (
                <p>
                  Keep completing tasks and inviting friends to improve your
                  points and community rank.
                </p>
              ) : (
                <>
                  <h3>Community participation, made visible.</h3>
                  <p>
                    Orbit Points is a wallet-connected Web3 community rewards
                    dashboard. Complete verified community activities and invite
                    friends to build a transparent points history and compare
                    your progress on the leaderboard.
                  </p>
                  <p className="platform-intro-note">
                    Points track participation inside Orbit Points. Future
                    benefits, eligibility rules, and reward programs will be
                    announced separately when available.
                  </p>
                </>
              )}
            </div>
            {!isConnected && (
              <button onClick={() => setWalletModalOpen(true)}>
                Connect Wallet
                <ArrowUpRight aria-hidden="true" />
              </button>
            )}
          </section>

          <section className="stats-grid" aria-label="Points overview">
            {stats.map((stat) => (
              <article
                className={`glass-card stat-card accent-${stat.accent} ${
                  isLoading ? "is-loading" : ""
                }`}
                key={stat.label}
              >
                <div className="stat-card-head">
                  <div className="stat-icon">
                    <stat.icon aria-hidden="true" />
                  </div>
                  <span className={`trend ${isConnected ? "positive" : ""}`}>
                    {stat.trend}
                  </span>
                </div>
                <div className="stat-content">
                  <span className="stat-label">{stat.label}</span>
                  {isLoading ? (
                    <span className="skeleton skeleton-value" />
                  ) : (
                    <strong>{stat.value}</strong>
                  )}
                  <p>{stat.detail}</p>
                  <small>{stat.hint}</small>
                </div>
              </article>
            ))}
          </section>

          <section className="content-grid">
            <div className="tasks-panel" id="daily-tasks">
              <div className="section-title">
                <div>
                  <span>DAILY TASKS</span>
                  <h3>Daily Tasks</h3>
                  <p>Complete available activities to grow your points balance.</p>
                </div>
                <button
                  className="section-link"
                  onClick={() => setShowAllTasks((current) => !current)}
                >
                  {showAllTasks ? "Show Less" : "View All"}
                  <ChevronRight aria-hidden="true" />
                </button>
              </div>

              <div className="task-list">
                {visibleTasks.map((task) => {
                  const status = task.completed
                    ? "completed"
                    : isConnected
                      ? "available"
                      : "locked";
                  const TaskIcon = taskIcons[task.id] ?? Rocket;

                  return (
                    <article
                      className={`glass-card task-card ${status} ${
                        isLoading ? "is-loading" : ""
                      }`}
                      id={
                        task.id === "invite-friends" ? "bonus-tasks" : undefined
                      }
                      key={task.id}
                    >
                      <div className="task-symbol">
                        <TaskIcon aria-hidden="true" />
                      </div>
                      <div className="task-copy">
                        <div className="task-meta">
                          <span>{task.category}</span>
                          <span className={`task-status ${status}`}>
                            {status === "completed" ? (
                              <Check aria-hidden="true" />
                            ) : status === "locked" ? (
                              <LockKeyhole aria-hidden="true" />
                            ) : (
                              <Zap aria-hidden="true" />
                            )}
                            {status}
                          </span>
                        </div>
                        <h4>{task.title}</h4>
                        <p>{task.description}</p>
                      </div>
                      <div className="task-action">
                        <strong className="reward-badge">
                          +{task.reward} Points
                        </strong>
                        <button
                          disabled={
                            task.completed || actionBusy === task.id
                          }
                          onClick={() => runTask(task.id)}
                        >
                          {task.completed
                            ? "Completed"
                            : actionBusy === task.id
                              ? "Starting..."
                              : status === "locked"
                                ? "Connect"
                                : "Start"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <aside
              className={`leaderboard-panel glass-card ${
                isLoading ? "is-loading" : ""
              }`}
              id="leaderboard"
            >
              <div className="section-title">
                <div>
                  <span>RANK</span>
                  <h3>Leaderboard</h3>
                  <p>Top community contributors this season.</p>
                </div>
                <span className="section-metric">Points</span>
              </div>

              <div className="leaderboard-list">
                {visibleLeaderboardMembers.map((member, index) => {
                  const sourceIndex = leaderboardMembers.findIndex(
                    (entry) => entry.name === member.name,
                  );
                  return (
                  <div
                    className={`${member.current ? "current-user" : ""} ${
                      sourceIndex < 3 ? `top-rank top-${sourceIndex + 1}` : ""
                    }`}
                    key={member.name}
                  >
                    <span className="position">
                      {sourceIndex < 3 ? (
                        <Medal aria-hidden="true" />
                      ) : (
                        sourceIndex + 1
                      )}
                    </span>
                    <span
                      className="avatar"
                      style={{ "--avatar": member.color } as React.CSSProperties}
                    >
                      {member.name.charAt(0)}
                    </span>
                    <span className="member-name">
                      <strong>{member.name}</strong>
                      <small>
                        {member.current
                          ? "YOU · Current rank"
                          : `Rank ${sourceIndex + 1}`}
                      </small>
                    </span>
                    <strong className="member-points">
                      {member.points.toLocaleString()}
                      <small> pts</small>
                    </strong>
                  </div>
                  );
                })}
              </div>

              <button
                className="leaderboard-button"
                onClick={() =>
                  setShowFullLeaderboard((current) => !current)
                }
              >
                {showFullLeaderboard ? "Show Top Rankings" : "View Full Leaderboard"}
              </button>
            </aside>
          </section>

          <section
            className={`invite-banner glass-card ${
              isLoading ? "is-loading" : ""
            }`}
            id="invite-friends"
          >
            <div className="invite-orbit" aria-hidden="true">
              <span />
            </div>
            <span className="invite-gift" aria-hidden="true">
              <Gift aria-hidden="true" />
            </span>
            <div>
              <span className="eyebrow">INVITE FRIENDS</span>
              <h3>Invite Friends, Earn More!</h3>
              <p>Invite your friends and grow your Orbit Points.</p>
              <small>
                Build your community contribution history and improve your
                leaderboard position over time.
              </small>
            </div>
            <button onClick={openVerifyModal}>
              Invite Now
              <ArrowUpRight aria-hidden="true" />
            </button>
          </section>

          <footer className="product-footer glass-card" id="profile">
            <div className="footer-brand">
              <Orbit aria-hidden="true" />
              <div>
                <strong>Orbit Points — Web3 Task Dashboard</strong>
                <small>Complete tasks, earn points, and grow your Orbit.</small>
              </div>
            </div>
            <div className="footer-socials" aria-label="Social links">
              <span className="footer-positioning">
                Orbit Points · Web3 community task and points dashboard
              </span>
              <a href="#twitter">X</a>
              <a href="#telegram">TG</a>
              <a href="#discord">DC</a>
            </div>
            <div className="footer-status">
              <span>
                <i />
                {network === "—" ? "Network ready" : `${network} online`}
              </span>
              <small>v1.0 UI</small>
            </div>
          </footer>
        </main>
      </div>

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
        open={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
      />
    </div>
  );
}
