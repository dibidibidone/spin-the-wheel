import css from "./jackpotVault.module.css";
import type { SpinStatus } from "./spinController";

export function JackpotVaultOverlay({
  status, muted, onSpin, onToggleSound, onClaim,
}: {
  status: SpinStatus;
  muted: boolean;
  onSpin: () => void;
  onToggleSound: () => void;
  onClaim: () => void;
}) {
  return (
    <div className={css.overlay}>
      <div className={css.top}>
        <div className={css.logo}>BOOMZINO</div>
        <button data-pe data-testid="sound-toggle" className={css.sound} onClick={onToggleSound} aria-label="Toggle sound">
          {muted ? "🔇" : "🔊"}
        </button>
      </div>
      <div className={css.hero}>
        <h1>BOOM your luck</h1>
        <div className={css.banner}>7 7 7</div>
      </div>
      <button
        data-pe data-testid="spin-button" className={css.cta}
        onClick={onSpin} disabled={status !== "idle"}
      >
        {status === "spinning" ? "SPINNING…" : "SPIN TO WIN"}
      </button>
      <div className={css.win} data-testid="win-modal" hidden={status !== "won"}>
        <div className={css.card} data-pe>
          <div style={{ fontSize: 44 }}>💰</div>
          <h2>JACKPOT — You won</h2>
          <div className={css.prize}>JACKPOT!</div>
          <button className={css.claim} onClick={onClaim}>Claim bonus</button>
        </div>
      </div>
    </div>
  );
}
