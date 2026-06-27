# Landing conversion redesign — Design Spec

**Date:** 2026-06-28
**Status:** Draft for review
**Branch:** `feat/landing-conversion-redesign` (off `feat/igaming-visual-polish`)

## 1. Goal

Make the spin/slot landings **convert harder** by fixing hierarchy and psychology, not by adding
unrelated widgets. Lead with the *prize*, surface *urgency + scarcity*, tighten the *focal flow* to
the SPIN button, sharpen *social-proof FOMO*, and streamline the *win→capture* funnel. The new
content is **admin-configurable per landing** (same pattern as the recent template/winText/logo
work), and applies to all five landings (2 3D wheels, 2 slots, 2D wheel) through the shared
`SpinOverlay` (+ the 2D `WheelClient`), with each theme supplying a fallback.

## 2. Current state (the conversion baseline already shipped)

Already present — we **enhance**, not duplicate: sticky CTA dock, the fused "spins-left" bar, the
red `LossBurst` + `WinBurst`, a single live-winner `SocialProof` line + "N won today", a `Countdown`,
a `TrustBar`, and the `WinSheet` email/phone lead-capture funnel (lead captured before redirect).
Content flows `Landing → lib/sceneConfig.buildSceneConfig → LandingSceneConfig → SpinOverlay`.
Conversion mechanics live in `ConversionConfig` (`components/r3f/kit/conversion.ts` / `types.ts`):
`prize, claimLabel, registerField, registerPlaceholder, redirectUrl, urgencyMs, social {winners[],
todayCount}, trust`, merged by `withConversionDefaults`. Copy lives in `OverlayCopy` (`logo, heading,
subtitle?, subBanner?, ctaLabel, spinningLabel, retryLabel?, nearMissLine?, almostText?, winTitle,
winPrize, winEmoji`).

**Observed gaps (from the live screens):** the hero states the *verb* not the *prize*; Alchemy-Lab
runs the generic default copy; the countdown is the smallest, lowest element; big dead vertical gap
(esp. slots) between game and CTA; social proof is a static single line.

## 3. Locked decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Scope | All four levers, **phased A → B → C**; build A first |
| Content source | **Admin-configurable** per landing (new `Landing` fields + editor), themes as fallback |
| FOMO mechanics | **Fabricated is fine** (generated winners/presence/scarcity), bounded-random |
| Above-the-fold layout | **Variant A — Offer-on-top + urgency-on-CTA** (see §5) |

## 4. Data model

New per-landing fields on `Landing` (Prisma; additive, defaults keep existing landings valid),
threaded through `buildSceneConfig` exactly like the existing `winText`/`logoUrl`:

```prisma
offerHeadline   String  @default("")   // "Win up to €500"   (Phase A)
offerSubline    String  @default("")   // "+ 200 Free Spins" (Phase A)
bonusesTotal    Int     @default(0)    // scarcity pool, 0 = hide scarcity (Phase A)
countdownMinutes Int    @default(10)   // urgency timer (Phase A; maps to urgencyMs)
socialProofOn   Boolean @default(true) // Phase B feed toggle
```

`buildSceneConfig` maps them:
- `copy.offerHeadline = landing.offerHeadline || theme fallback`; `copy.offerSubline = …`.
- `config.urgencyMs = landing.countdownMinutes * 60_000`.
- `config.scarcity = bonusesTotal > 0 ? { total: bonusesTotal } : undefined`.
- `config.socialProofOn = landing.socialProofOn`.

New types (additive):
- `OverlayCopy.offerHeadline?: string`, `OverlayCopy.offerSubline?: string`.
- `ConversionConfig.scarcity?: { total: number }`; `ConversionConfig.socialProofOn?: boolean`;
  `ConversionConfig.social.playingBase?: number` (Phase B presence seed).

## 5. Phase A — above-the-fold (Variant A)

Rendered in the shared `SpinOverlay` and mirrored in the 2D `WheelClient`. Layout, top→bottom:

```
logo · sound
OfferBanner:  offerHeadline (xl bold)  /  offerSubline (gold)      ← NEW, replaces verb-y heading
   (theme line demoted to a small subhead under it)
( WHEEL / REELS )                                                  ← game, tightened upward
SocialProof line  ·  ScarcityLine "🔥 {left} of {total} bonuses left"   ← NEW scarcity
┌ 🎯 {n} SPINS LEFT ───────────────────────────────────────────┐
│  {ctaLabel}                                        ⏳ {mm:ss} │   ← Countdown FUSED onto CTA
└──────────────────────────────────────────────────────────────┘
TrustBar (single compact line)
```

**Components (small, isolated, reduced-motion-gated like the bursts):**
- **`OfferBanner({ headline, subline })`** — new. Renders nothing if `headline` empty (prototype
  themes set it, so it always shows there). Becomes the dominant top element; the old `heading`
  demotes to a small subhead via existing `subtitle`.
- **`ScarcityLine({ total })`** — new. Shows "🔥 {left} of {total} bonuses left" where `left` is a
  bounded-random value derived once per session (stable within a visit, e.g. `total` minus a seeded
  random 70–95%). Hidden when `total` is 0/undefined.
- **Countdown on the CTA** — reposition the existing `Countdown` from the page bottom into the
  spins-left/CTA bar (beside the `🎯 N SPINS LEFT` chip). Same `urgencyMs` mechanic + storage key.
- **Focal-flow tightening** — collapse the dead gap (esp. slots) so game → proof/scarcity → CTA read
  as one thumb-zone block; this is CSS in `spinOverlay.module.css` (dock spacing, the slot scenes'
  reel vertical offset). **CTA emphasis:** add a stronger pulse + a one-shot **"👆 tap to spin"**
  coachmark on first idle load that dismisses on first interaction (sessionStorage-guarded,
  reduced-motion → static hint or none).
- **TrustBar** — restyle to a single compact line (no new component).

## 6. Phase B — live social proof

Upgrade the static `SocialProof` line to a **rotating** generated feed + a presence counter, gated by
`config.socialProofOn`:
- **Rotating winners:** cycle the `social.winners` (already themed) every few seconds with a small
  cross-fade; names × the landing's *real* prize labels keep it on-brand. (`winners` stays
  admin/theme data; rotation is client-side.)
- **`PlayingNow({ base })`** — new. "🟢 {N} playing now", bounded-random drift around
  `social.playingBase` (fabricated), updates every few seconds. Reduced-motion → static value.
- Keep "N won today" (`social.todayCount`).

## 7. Phase C — WinSheet capture funnel

Restyle (not rewrite) `WinSheet`:
- **Single-field capture** per `registerField` (`email` *or* `tel`) — large input, correct
  `inputmode`/`autocomplete`, `registerPlaceholder`. No second field.
- **Trust/payment badge row** at the form (reuse `trust` copy + a small payment-logos strip) to
  reduce form anxiety at the exact decision point.
- **One-tap submit**, `claimLabel` CTA; lead captured *before* redirect (unchanged behavior).
- Keep the existing claim state machine (`claimMachine` / `ClaimStep`).

## 8. Editor changes

A new **"Conversion"** field group (in the Content tab, beside the existing prize/copy fields):
`offerHeadline`, `offerSubline`, `bonusesTotal`, `countdownMinutes`, `socialProofOn` toggle. Wired
through the existing `patchSchema` + save payload + `EditableLanding`/`getEditableLanding`, mirroring
how `winText`/`logoUrl` were added. Gated by `templateKind` only if a field is irrelevant (all apply
to every kind here).

## 9. Cross-landing + themes

All five landings inherit Phase A/B via the shared `SpinOverlay`; the 2D `WheelClient` mirrors the
`OfferBanner` + `ScarcityLine` + CTA-countdown blocks for parity. Each theme's `*Copy`/`conversion`
gains fallback `offerHeadline`/`offerSubline`/`scarcity`/`playingBase` so the **prototype routes**
(no DB config) look fully designed — and Alchemy-Lab gets real themed copy, fixing its generic hero.

## 10. Accessibility / reduced motion

Pulse, coachmark, winner cross-fade, and presence drift are all hidden/static under
`@media (prefers-reduced-motion: reduce)` (same discipline as `WinBurst`/`LossBurst`). New text blocks
use semantic markup; the CTA coachmark is `aria-hidden` decoration. Scarcity/presence are visual FOMO,
not announced assertively.

## 11. Testing

- **Unit/component:** `OfferBanner` (renders/empty-hides), `ScarcityLine` (math + hidden at 0),
  `PlayingNow` (bounded drift, reduced-motion static), `SpinOverlay` composition (offer present,
  countdown on CTA, gating), `buildSceneConfig` mapping of the new fields, editor save-payload.
- **Visual verification:** screenshot harness across all 5 landings — idle (offer + scarcity +
  CTA-countdown), near-miss, win (WinSheet funnel) — plus a reduced-motion pass. (Run on the dev
  server / alt-port harness per the project's e2e notes.)
- No live external calls; FOMO generators are deterministic-seedable for tests.

## 12. Phasing / out of scope

- **Build order:** Phase A (offer + urgency + focal flow) → B (social/FOMO) → C (WinSheet funnel).
  Each phase is independently shippable and testable.
- **Out of scope:** real winner data / analytics; A/B-test infrastructure; exit-intent or
  consolation-offer mechanics; per-jurisdiction compliance gating of fabricated FOMO; the reward-ladder
  and sticky-chip variants (B/C from the layout options — not chosen).

## 13. Open questions (resolve in planning)

1. Exact "left" derivation for scarcity — pure per-session random, or decrement on each spin for
   felt pressure? (Lean: seeded per-session, optional decrement on spin.)
2. Coachmark wording/dismiss — "tap to spin" vs an animated finger only; dismiss on first spin vs
   first tap anywhere. (Lean: text + finger, dismiss on first spin.)
3. Payment-logos source for the WinSheet badge row — static asset set vs admin-config (lean: static
   asset set in Phase C, not configurable).
