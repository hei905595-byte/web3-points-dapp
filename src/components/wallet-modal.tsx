"use client";

import type { WalletKind } from "@/types/wallet";

interface WalletModalProps {
  open: boolean;
  busy: WalletKind | null;
  error: string;
  onClose: () => void;
  onConnect: (wallet: WalletKind) => void;
}

export function WalletModal({
  open,
  busy,
  error,
  onClose,
  onConnect,
}: WalletModalProps) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        aria-labelledby="wallet-title"
        aria-modal="true"
        className="wallet-modal"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button className="modal-close" onClick={onClose} aria-label="关闭">
          ×
        </button>
        <div className="modal-kicker">安全连接</div>
        <h2 id="wallet-title">选择你的钱包</h2>
        <p className="modal-copy">
          我们只会请求连接与签名，不会发起交易或访问你的资产。
        </p>

        <div className="wallet-list">
          <button
            className="wallet-option"
            disabled={Boolean(busy)}
            onClick={() => onConnect("metamask")}
          >
            <span className="wallet-logo metamask-logo">M</span>
            <span>
              <strong>MetaMask</strong>
              <small>浏览器扩展钱包</small>
            </span>
            <span className="option-arrow">
              {busy === "metamask" ? "···" : "→"}
            </span>
          </button>
          <button
            className="wallet-option"
            disabled={Boolean(busy)}
            onClick={() => onConnect("tokenpocket")}
          >
            <span className="wallet-logo tp-logo">TP</span>
            <span>
              <strong>TokenPocket</strong>
              <small>移动端与浏览器钱包</small>
            </span>
            <span className="option-arrow">
              {busy === "tokenpocket" ? "···" : "→"}
            </span>
          </button>
        </div>

        {error && <p className="modal-error">{error}</p>}
        <p className="modal-footnote">
          连接即表示你同意 Nova Points 的使用条款。
        </p>
      </section>
    </div>
  );
}
