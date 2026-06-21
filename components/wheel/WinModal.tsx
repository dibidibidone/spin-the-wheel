export function WinModal({
  open, title, prizeLabel, claimLabel, onClaim,
}: {
  open: boolean;
  title: string;
  prizeLabel: string;
  claimLabel: string;
  onClaim: () => void;
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="You won">
      <div className="modal-card">
        <div className="modal-emoji" aria-hidden="true">🎉</div>
        <h2 className="modal-title">{title}</h2>
        <p className="modal-prize">{prizeLabel}</p>
        <button className="btn-claim" onClick={onClaim}>{claimLabel}</button>
      </div>
    </div>
  );
}
