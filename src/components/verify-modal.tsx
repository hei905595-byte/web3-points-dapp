"use client";

import { useState } from "react";
import { pointsApi } from "@/lib/points-api";

interface VerifyModalProps {
  address: string;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function VerifyModal({
  address,
  open,
  onClose,
  onUpdated,
}: VerifyModalProps) {
  const [inviteCode, setInviteCode] = useState("");
  const [ownCode, setOwnCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const createCode = async () => {
    if (!address) {
      setMessage("Connect and verify a TRON wallet first.");
      return;
    }
    setBusy(true);
    try {
      const result = await pointsApi.createInviteCode();
      setOwnCode(result.code);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  };

  const bindCode = async () => {
    if (!address) {
      setMessage("Connect and verify a TRON wallet first.");
      return;
    }
    setBusy(true);
    try {
      await pointsApi.bindInvite(inviteCode);
      setMessage("Invitation bound successfully.");
      onUpdated();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        aria-labelledby="verify-title"
        aria-modal="true"
        className="verify-modal glass-card"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <span className="modal-kicker">ORBIT INVITES</span>
        <h2 id="verify-title">Invite Friends</h2>
        <p>Create your invitation code or bind one received from a friend.</p>

        <button className="verify-button" disabled={busy} onClick={createCode}>
          {ownCode || "Create My Code"}
        </button>

        <input
          aria-label="Invitation code"
          disabled={busy}
          onChange={(event) => setInviteCode(event.target.value)}
          placeholder="Enter invitation code"
          value={inviteCode}
        />
        <button
          className="verify-button"
          disabled={busy || !inviteCode.trim()}
          onClick={bindCode}
        >
          Bind Invitation
        </button>
        {message && <p className="modal-error">{message}</p>}
      </section>
    </div>
  );
}
