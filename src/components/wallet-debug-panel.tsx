"use client";

import { useEffect, useState } from "react";

interface WalletDebugState {
  ethereum: boolean;
  tp: boolean;
  tokenpocket: boolean;
  tronWeb: boolean;
  userAgent: string;
}

function readDebugState(): WalletDebugState {
  return {
    ethereum: Boolean(window.ethereum),
    tp: Boolean(window.tp),
    tokenpocket: Boolean(window.tokenpocket),
    tronWeb: Boolean(window.tronWeb),
    userAgent: window.navigator.userAgent,
  };
}

export function WalletDebugPanel() {
  const [state, setState] = useState<WalletDebugState | null>(null);

  useEffect(() => {
    const update = () => setState(readDebugState());
    update();

    const timer = window.setInterval(update, 500);
    window.addEventListener("ethereum#initialized", update);
    window.addEventListener("eip6963:announceProvider", update);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("ethereum#initialized", update);
      window.removeEventListener("eip6963:announceProvider", update);
    };
  }, []);

  if (!state) return null;

  return (
    <aside
      aria-label="Wallet detection debug"
      style={{
        position: "fixed",
        right: 8,
        bottom: 8,
        zIndex: 2147483647,
        width: "min(360px, calc(100vw - 16px))",
        padding: 10,
        border: "1px solid #64748b",
        borderRadius: 6,
        background: "rgba(15, 23, 42, 0.96)",
        color: "#e2e8f0",
        font: "12px/1.45 monospace",
        overflowWrap: "anywhere",
        pointerEvents: "none",
      }}
    >
      <div>window.ethereum: {String(state.ethereum)}</div>
      <div>window.tp: {String(state.tp)}</div>
      <div>window.tokenpocket: {String(state.tokenpocket)}</div>
      <div>window.tronWeb: {String(state.tronWeb)}</div>
      <div>navigator.userAgent: {state.userAgent}</div>
    </aside>
  );
}
