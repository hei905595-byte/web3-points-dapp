"use client";

import { useEffect, useRef, useState } from "react";
import {
  createInitialProfile,
  pointsApi,
  type PointsProfile,
} from "@/lib/mock-points-api";
import { shortenAddress, waitForWalletProvider } from "@/lib/wallet";
import type { EthereumProvider, WalletKind } from "@/types/wallet";
import { VerifyModal } from "./verify-modal";
import { WalletDebugPanel } from "./wallet-debug-panel";
import { WalletModal } from "./wallet-modal";

const navigation = [
  { label: "Dashboard", href: "#dashboard", icon: "grid" },
  { label: "Daily Tasks", href: "#daily-tasks", icon: "check" },
  { label: "Bonus Tasks", href: "#bonus-tasks", icon: "spark" },
  { label: "Leaderboard", href: "#leaderboard", icon: "rank" },
  { label: "Invite Friends", href: "#invite-friends", icon: "invite" },
  { label: "Profile", href: "#profile", icon: "user" },
];

const leaderboard = [
  { name: "Alex Morgan", points: 12840, color: "#8b5cf6" },
  { name: "Mia Chen", points: 11290, color: "#ec4899" },
  { name: "Noah Williams", points: 9840, color: "#06b6d4" },
  { name: "You", points: 1280, color: "#a78bfa", current: true },
];

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16 9" />
      </>
    ),
    spark: <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />,
    rank: (
      <>
        <path d="M7 20v-6h4v6M14 20V9h4v11M3 20v-3h4v3" />
        <path d="M4 11 9 6l4 3 6-6" />
      </>
    ),
    invite: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M19 8v6M22 11h-6" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      {paths[name]}
    </svg>
  );
}

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
  const walletProviders = useRef<
    Partial<Record<WalletKind, EthereumProvider>>
  >({});

  function openVerifyModal() {
    setVerifyModalOpen(true);
  }

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
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[];
      const nextAddress = accounts?.[0];

      if (!nextAddress) {
        setError("No wallet account is available.");
        return;
      }

      setAddress(nextAddress);
      setWalletModalOpen(false);
      checkAddressBalance();
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
  const stats = [
    {
      label: "Total Points",
      value: isConnected ? (profile?.balance ?? 0).toLocaleString() : "0",
      detail: "Points",
      icon: "✦",
    },
    {
      label: "Tasks Completed",
      value: isConnected
        ? String(profile?.tasks.filter((task) => task.completed).length ?? 0)
        : "0",
      detail: "Tasks",
      icon: "✓",
    },
    {
      label: "Daily Streak",
      value: isConnected ? String(profile?.streak ?? 0) : "0",
      detail: "Daily Check-in",
      icon: "◇",
    },
    {
      label: "Rank",
      value: isConnected ? `#${profile?.rank ?? 0}` : "0",
      detail: "Rank",
      icon: "↗",
    },
  ];
  const tasks = profile?.tasks ?? createInitialProfile().tasks;

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
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="sidebar-card">
          <span className="sidebar-card-icon">✦</span>
          <strong>Orbit Points</strong>
          <p>Complete Tasks and track your Rewards.</p>
          <button onClick={openVerifyModal}>Profile</button>
        </div>
      </aside>

      <div className="app-content">
        <header className="top-header">
          <div>
            <span className="mobile-brand-mark">O</span>
            <h1>Orbit Points</h1>
          </div>
          {isConnected ? (
            <button className="wallet-button connected" onClick={disconnect}>
              <span className="connection-dot" />
              {shortenAddress(address)}
            </button>
          ) : (
            <button
              className="wallet-button"
              onClick={() => setWalletModalOpen(true)}
            >
              <span className="wallet-button-icon">◇</span>
              Connect Wallet
            </button>
          )}
        </header>

        <main className="dashboard-main" id="dashboard">
          <section className="welcome-row">
            <div>
              <span className="eyebrow">ORBIT POINTS DASHBOARD</span>
              <h2>Welcome to your Orbit</h2>
              <p>Track Points, complete Tasks, and view your Rank.</p>
            </div>
            <div className="season-chip">
              <span />
              Rewards active
            </div>
          </section>

          <section className="stats-grid" aria-label="Points overview">
            {stats.map((stat) => (
              <article className="glass-card stat-card" key={stat.label}>
                <div className="stat-icon">{stat.icon}</div>
                <div>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                  <small>{stat.detail}</small>
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
                </div>
                <small>{isConnected ? "Connected" : "Connect Wallet"}</small>
              </div>

              <div className="task-list">
                {tasks.map((task, index) => (
                  <article
                    className={`glass-card task-card ${
                      task.completed ? "completed" : ""
                    }`}
                    id={index === 2 ? "bonus-tasks" : undefined}
                    key={task.id}
                  >
                    <div className="task-symbol">{task.icon}</div>
                    <div className="task-copy">
                      <span>{task.category}</span>
                      <h4>{task.title}</h4>
                      <p>{task.description}</p>
                    </div>
                    <div className="task-action">
                      <strong>+{task.reward} Points</strong>
                      <button
                        disabled={task.completed || actionBusy === task.id}
                        onClick={() => runTask(task.id)}
                      >
                        {task.completed
                          ? "Completed"
                          : actionBusy === task.id
                            ? "Starting..."
                            : "Start"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <aside className="leaderboard-panel glass-card" id="leaderboard">
              <div className="section-title">
                <div>
                  <span>RANK</span>
                  <h3>Leaderboard</h3>
                </div>
                <small>Points</small>
              </div>

              <div className="leaderboard-list">
                {leaderboard.map((member, index) => (
                  <div
                    className={member.current ? "current-user" : ""}
                    key={member.name}
                  >
                    <span className="position">{index + 1}</span>
                    <span
                      className="avatar"
                      style={{ "--avatar": member.color } as React.CSSProperties}
                    >
                      {member.name.charAt(0)}
                    </span>
                    <span className="member-name">
                      <strong>{member.name}</strong>
                      <small>{member.current ? "Current Rank" : "Rank"}</small>
                    </span>
                    <strong className="member-points">
                      {member.points.toLocaleString()}
                    </strong>
                  </div>
                ))}
              </div>

              <button className="leaderboard-button">View Rank</button>
            </aside>
          </section>

          <section className="invite-banner" id="invite-friends">
            <div className="invite-orbit" aria-hidden="true">
              <span />
            </div>
            <div>
              <span className="eyebrow">INVITE FRIENDS</span>
              <h3>Grow your Orbit together</h3>
              <p>Invite Friends and explore more Tasks and Rewards.</p>
            </div>
            <button onClick={openVerifyModal}>Invite Now</button>
          </section>

          <section className="profile-anchor" id="profile">
            <span>Orbit Points</span>
            <span>Points · Tasks · Rewards · Rank</span>
          </section>
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
      <WalletDebugPanel />
    </div>
  );
}
