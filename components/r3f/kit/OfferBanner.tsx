import css from "./offerBanner.module.css";

// The prize-forward headline that leads the page (Variant A). Hidden when there's no
// configured/themed offer, so non-offer landings degrade cleanly.
export function OfferBanner({ headline, subline }: { headline?: string; subline?: string }) {
  if (!headline) return null;
  return (
    <div className={css.wrap} data-testid="offer-banner">
      <div className={css.headline}>{headline}</div>
      {subline && <div className={css.subline}>{subline}</div>}
    </div>
  );
}
