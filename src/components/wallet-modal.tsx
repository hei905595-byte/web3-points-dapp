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
        className="wallet-modal glass-card"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <span className="modal-kicker">ORBIT POINTS</span>
        <h2 id="wallet-title">Connect Wallet</h2>
        <p className="modal-copy">
          Choose MetaMask or TokenPocket. Connecting only requests your wallet
          account.
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
              <small>Browser and mobile wallet</small>
            </span>
            <span>{busy === "metamask" ? "..." : "→"}</span>
          </button>
          <button
            className="wallet-option"
            disabled={Boolean(busy)}
            onClick={() => onConnect("tokenpocket")}
          >
            <span className="wallet-logo tp-logo">TP</span>
            <span>
              <strong>TokenPocket</strong>
              <small>Mobile DApp browser</small>
            </span>
            <span>{busy === "tokenpocket" ? "..." : "→"}</span>
          </button>
        </div>

        {error && <p className="modal-error">{error}</p>}
        <p className="modal-footnote">Orbit Points does not request a signature.</p>
      </section>
    </div>
  );
}
