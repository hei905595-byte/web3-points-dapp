"use client";

import { BrowserProvider } from "ethers";
import { useCallback, useEffect, useState } from "react";
import {
  pointsApi,
  type PointsProfile,
} from "@/lib/mock-points-api";
import {
  getWalletProvider,
  shortenAddress,
  walletInstallUrl,
} from "@/lib/wallet";
import type { WalletKind } from "@/types/wallet";
import { WalletModal } from "./wallet-modal";

function Logo() {
  return (
    <a className="brand" href="#" aria-label="Nova Points 首页">
      <span className="brand-mark">N</span>
      <span>NOVA</span>
    </a>
  );
}

export function Dashboard() {
  const [address, setAddress] = useState("");
  const [profile, setProfile] = useState<PointsProfile | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [walletBusy, setWalletBusy] = useState<WalletKind | null>(null);
  const [actionBusy, setActionBusy] = useState("");
  const [error, setError] = useState("");
  const [sessionLoading, setSessionLoading] = useState(true);

  const loadProfile = useCallback(async (walletAddress: string) => {
    const data = await pointsApi.getProfile(walletAddress);
    setProfile(data);
  }, []);

  useEffect(() => {
    fetch("/api/auth/session")
      .then(async (response) => {
        if (!response.ok) return;
        const data = (await response.json()) as { address: string };
        setAddress(data.address);
        await loadProfile(data.address);
      })
      .finally(() => setSessionLoading(false));
  }, [loadProfile]);

  const connectWallet = async (kind: WalletKind) => {
    setError("");
    const injectedProvider = getWalletProvider(kind);
    if (!injectedProvider) {
      setError(
        `${kind === "metamask" ? "MetaMask" : "TokenPocket"} 未检测到，正在打开安装页面。`,
      );
      window.open(walletInstallUrl(kind), "_blank", "noopener,noreferrer");
      return;
    }

    setWalletBusy(kind);
    try {
      const accounts = (await injectedProvider.request({
        method: "eth_requestAccounts",
      })) as string[];
      const walletAddress = accounts[0];
      if (!walletAddress) throw new Error("钱包中没有可用账户。");

      const nonceResponse = await fetch("/api/auth/nonce", { method: "POST" });
      if (!nonceResponse.ok) throw new Error("无法创建登录请求。");
      const { nonce } = (await nonceResponse.json()) as { nonce: string };
      const message = `登录 Nova Points\n\n钱包地址: ${walletAddress}\n一次性验证码: ${nonce}`;

      const provider = new BrowserProvider(injectedProvider);
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(message);
      const verifyResponse = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: walletAddress, signature }),
      });
      const result = (await verifyResponse.json()) as {
        address?: string;
        error?: string;
      };
      if (!verifyResponse.ok || !result.address) {
        throw new Error(result.error || "登录失败。");
      }

      setAddress(result.address);
      await loadProfile(result.address);
      setModalOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "钱包连接失败。");
    } finally {
      setWalletBusy(null);
    }
  };

  const disconnect = async () => {
    await fetch("/api/auth/session", { method: "DELETE" });
    setAddress("");
    setProfile(null);
  };

  const checkIn = async () => {
    if (!address || !profile || profile.checkedInToday) return;
    setActionBusy("checkin");
    setProfile(await pointsApi.checkIn(address));
    setActionBusy("");
  };

  const claimQuest = async (questId: string) => {
    if (!address) return;
    setActionBusy(questId);
    setProfile(await pointsApi.claimQuest(address, questId));
    setActionBusy("");
  };

  const isLoggedIn = Boolean(address && profile);

  return (
    <main>
      <header className="site-header">
        <div className="shell header-inner">
          <Logo />
          <nav aria-label="主导航">
            <a className="active" href="#home">
              首页
            </a>
            <a href="#quests">任务</a>
            <a href="#rewards">积分</a>
          </nav>
          {isLoggedIn ? (
            <button className="address-button" onClick={disconnect}>
              <span className="status-dot" />
              {shortenAddress(address)}
              <span className="logout-hint">退出</span>
            </button>
          ) : (
            <button
              className="connect-button"
              disabled={sessionLoading}
              onClick={() => setModalOpen(true)}
            >
              {sessionLoading ? "加载中…" : "连接钱包"}
            </button>
          )}
        </div>
      </header>

      <section className="hero shell" id="home">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />
        <div className="hero-copy">
          <div className="eyebrow">
            <span>✦</span> NOVA REWARDS PROTOCOL
          </div>
          <h1>
            参与生态，
            <br />
            <em>让每一步都有价值。</em>
          </h1>
          <p>
            连接钱包，完成任务并积累 Nova Points。
            <br />
            你的每一次参与，都在构建更开放的数字未来。
          </p>
          <div className="hero-actions">
            <button
              className="primary-cta"
              onClick={() =>
                isLoggedIn
                  ? document
                      .querySelector("#quests")
                      ?.scrollIntoView({ behavior: "smooth" })
                  : setModalOpen(true)
              }
            >
              {isLoggedIn ? "查看我的任务" : "开始赚取积分"} <span>→</span>
            </button>
            <a className="text-link" href="#how">
              了解运作方式 <span>↗</span>
            </a>
          </div>
          <div className="trust-row">
            <span>
              <i>✓</i> 无需交易
            </span>
            <span>
              <i>✓</i> 签名登录
            </span>
            <span>
              <i>✓</i> 资产安全
            </span>
          </div>
        </div>

        <div className="orb-stage" aria-hidden="true">
          <div className="orbit orbit-one">
            <span />
          </div>
          <div className="orbit orbit-two">
            <span />
          </div>
          <div className="nova-orb">
            <div className="orb-shine" />
            <strong>N</strong>
          </div>
          <div className="floating-chip chip-one">+100</div>
          <div className="floating-chip chip-two">✦</div>
          <div className="floating-chip chip-three">+60</div>
        </div>
      </section>

      <section className="metrics-band">
        <div className="shell metrics">
          <div>
            <strong>24.8K</strong>
            <span>活跃参与者</span>
          </div>
          <div>
            <strong>18.6M</strong>
            <span>已发放积分</span>
          </div>
          <div>
            <strong>42</strong>
            <span>生态任务</span>
          </div>
          <div>
            <strong>7 Days</strong>
            <span>当前赛季剩余</span>
          </div>
        </div>
      </section>

      <section className="dashboard-section shell" id="rewards">
        <div className="section-heading">
          <div>
            <span className="section-label">YOUR PROGRESS</span>
            <h2>{isLoggedIn ? "我的积分中心" : "连接钱包，开启积分旅程"}</h2>
          </div>
          {!isLoggedIn && (
            <button className="outline-button" onClick={() => setModalOpen(true)}>
              连接钱包 →
            </button>
          )}
        </div>

        {address && profile ? (
          <div className="dashboard-grid">
            <article className="balance-card">
              <div className="card-topline">
                <span>可用积分</span>
                <span className="season-pill">SEASON 01</span>
              </div>
              <strong className="balance">
                {profile.balance.toLocaleString()}
                <small>PTS</small>
              </strong>
              <div className="progress-track">
                <span style={{ width: `${Math.min(profile.balance / 20, 100)}%` }} />
              </div>
              <div className="balance-meta">
                <span>距离下一等级还需 {Math.max(2000 - profile.balance, 0)} PTS</span>
                <b>LV. 4</b>
              </div>
            </article>

            <article className="checkin-card">
              <div className="checkin-icon">✦</div>
              <div>
                <span>连续签到</span>
                <strong>{profile.streak} 天</strong>
              </div>
              <button
                disabled={profile.checkedInToday || actionBusy === "checkin"}
                onClick={checkIn}
              >
                {profile.checkedInToday
                  ? "今日已签到"
                  : actionBusy === "checkin"
                    ? "处理中…"
                    : "签到 +60"}
              </button>
            </article>

            <article className="rank-card">
              <span>社区排名</span>
              <strong>#{profile.rank}</strong>
              <small>领先 76% 的参与者</small>
            </article>
          </div>
        ) : (
          <div className="preview-panel">
            <div className="preview-lock">N</div>
            <div>
              <h3>你的积分面板已准备就绪</h3>
              <p>登录后查看积分余额、连续签到、社区排名与任务进度。</p>
            </div>
          </div>
        )}
      </section>

      <section className="quests-section shell" id="quests">
        <div className="section-heading">
          <div>
            <span className="section-label">FEATURED QUESTS</span>
            <h2>本周精选任务</h2>
          </div>
          <span className="refresh-note">每周一 00:00 更新</span>
        </div>

        <div className="quest-grid">
          {(profile?.quests ?? [
            {
              id: "connect",
              title: "完成钱包登录",
              description: "使用支持的钱包完成一次签名登录",
              reward: 100,
              icon: "⌁",
              claimed: false,
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
          ]).map((quest, index) => (
            <article className="quest-card" key={quest.id}>
              <div className={`quest-icon icon-${index + 1}`}>{quest.icon}</div>
              <div className="quest-content">
                <span>0{index + 1} / QUEST</span>
                <h3>{quest.title}</h3>
                <p>{quest.description}</p>
                <div className="quest-footer">
                  <strong>+{quest.reward} PTS</strong>
                  <button
                    disabled={quest.claimed || actionBusy === quest.id}
                    onClick={() =>
                      isLoggedIn
                        ? claimQuest(quest.id)
                        : setModalOpen(true)
                    }
                  >
                    {quest.claimed
                      ? "已领取 ✓"
                      : actionBusy === quest.id
                        ? "处理中…"
                        : isLoggedIn
                          ? "领取奖励"
                          : "连接后参与"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="how-section" id="how">
        <div className="shell">
          <div className="section-heading light-heading">
            <div>
              <span className="section-label">HOW IT WORKS</span>
              <h2>三步开始你的积分旅程</h2>
            </div>
          </div>
          <div className="steps">
            <div>
              <span>01</span>
              <h3>连接钱包</h3>
              <p>使用 MetaMask 或 TokenPocket 完成安全签名登录。</p>
            </div>
            <div>
              <span>02</span>
              <h3>完成任务</h3>
              <p>探索生态、每日签到，参与不同类型的社区活动。</p>
            </div>
            <div>
              <span>03</span>
              <h3>累积积分</h3>
              <p>提升等级与排名，为后续生态权益做好准备。</p>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="shell footer-inner">
          <Logo />
          <p>© 2026 Nova Protocol. Built for the open web.</p>
          <div>
            <a href="#">X</a>
            <a href="#">Discord</a>
            <a href="#">Docs</a>
          </div>
        </div>
      </footer>

      <WalletModal
        busy={walletBusy}
        error={error}
        onClose={() => {
          if (!walletBusy) setModalOpen(false);
        }}
        onConnect={connectWallet}
        open={modalOpen}
      />
    </main>
  );
}
