"use client";

interface VerifyModalProps {
  open: boolean;
  onClose: () => void;
}

export function VerifyModal({ open, onClose }: VerifyModalProps) {
  if (!open) return null;

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
        <div className="verify-icon">✦</div>
        <span className="modal-kicker">ORBIT POINTS</span>
        <h2 id="verify-title">Profile</h2>
        <p>
          This interface is reserved for a future verification experience.
        </p>
        <button className="verify-button" onClick={onClose}>
          Close
        </button>
      </section>
    </div>
  );
}
