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
        <h2 id="wallet-title">Connect TRON Wallet</h2>
        <p className="modal-copy">
          Connect a TRON wallet and sign a one-time login challenge.
        </p>

        <div className="wallet-list">
          <button
            className="wallet-option"
            disabled={Boolean(busy)}
            onClick={() => onConnect("tronlink")}
          >
            <span className="wallet-logo metamask-logo">TL</span>
            <span>
              <strong>TronLink</strong>
              <small>TRON browser and mobile wallet</small>
            </span>
            <span>{busy === "tronlink" ? "..." : "→"}</span>
          </button>
          <button
            className="wallet-option"
            disabled={Boolean(busy)}
            onClick={() => onConnect("tokenpocket")}
          >
            <span className="wallet-logo tp-logo">TP</span>
            <span>
              <strong>TokenPocket</strong>
              <small>TRON mobile DApp browser</small>
            </span>
            <span>{busy === "tokenpocket" ? "..." : "→"}</span>
          </button>
        </div>

        {error && <p className="modal-error">{error}</p>}
        <p className="modal-footnote">
          Signing verifies login only. It does not submit a transaction.
        </p>
      </section>
    </div>
  );
}
