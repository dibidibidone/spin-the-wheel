import css from "./trustBar.module.css";

export function TrustBar({ text }: { text: string }) {
  return <div className={css.bar} data-testid="trust-bar">{text}</div>;
}
