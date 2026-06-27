# How to add a domain to each landing

Every landing gets its **own domain**. You manage it from the landing's **Domains** tab
(open a landing → **Domains**). There are two ways to add one, plus rotation for burned domains.

> **Heads-up — why you may see "Unexpected error" right now:** both flows call external APIs
> (Namecheap to buy, Cloudflare for DNS/SSL, Vercel to attach the host to the origin). Those API
> keys live in the **server environment** (`.env`), never in this UI. Until they're set, **Search**
> errors with *"Unexpected error"* and **Add domain** fails to attach. Set the keys first
> (see [§3](#3-one-time-setup-required-once-not-per-landing)).

---

## 1. Option A — buy a fresh domain automatically (recommended)

Use this when you want a brand-new domain per landing (the burner-rotation model).

1. Open the landing → **Domains** tab.
2. In **Search**, type a brand/keyword (e.g. `boomzino`) **or** a full domain (`boomzino.xyz`) → **Search**.
   You'll get availability + price across the default TLDs (`.com .net .click .online .xyz`).
3. Click **Buy & provision `<name>`**. The system then, automatically:
   `register at Namecheap → create the Cloudflare zone + point DNS at the origin (DNS-only) →
   attach the host to the app → wait for SSL → mark it live`.
4. Watch the status on the domain row: `purchasing → dns_pending → attaching → ssl_pending → live`.
   A background job advances it every few minutes — you don't have to babysit it. When it reads
   **live**, the landing is served at `https://<domain>`.

> **One live domain per landing.** The first domain that reaches `live` becomes the landing's
> **primary** (the one it serves on). Buying a *second* domain on the same landing will **not**
> take over — to replace a domain, use **Rotate** (below), not a second buy.

---

## 2. Option B — attach a domain you already own

Use this if you bought the domain elsewhere and just want to point it at this landing.

1. Register/own the domain at any registrar.
2. Point its DNS at the origin: an **A record** for the apex → the origin IP
   (`ORIGIN_DNS_TARGET`, default `76.76.21.21` = Vercel), left **DNS-only** (no proxy).
3. In the **Domains** tab, type the hostname into the **Add domain** box → **Add domain**.
4. The panel shows the exact DNS record to set and verifies it; once verified, SSL is issued and the
   landing serves on that host. (This path still needs `VERCEL_*` set so the app can attach the host.)

---

## 3. Rotating / replacing a domain (when one gets flagged or blocked)

iGaming domains get blacklisted — replacing them is routine, and it's **zero-downtime**:

- **Rotate**: on the live domain's row, click **Rotate** and enter the new hostname. The app buys +
  provisions the fresh domain to `live` **first**, then atomically switches the landing onto it and
  retires the old one. The landing never goes dark during the swap.
- **Mark flagged**: tags a domain as compromised (so you can see which to replace), then Rotate.
- **Retry**: if a domain got stuck in `failed`, re-runs its next step (it never re-buys — the
  purchase is guarded).

A **retired** domain stops serving immediately (its zone + origin attach are torn down, and the app
refuses to serve `retired`/`failed` hosts).

---

## 4. One-time setup (required once, not per-landing)

The per-landing flow is automatic, but it needs API keys in `.env` (copy `.env.example` and fill in):

| Purpose | Vars |
|---|---|
| Buy domains (registrar) | `NAMECHEAP_API_USER`, `NAMECHEAP_API_KEY`, `NAMECHEAP_USERNAME`, `NAMECHEAP_CLIENT_IP` (allowlisted), `NAMECHEAP_SANDBOX` |
| WHOIS registrant (PII) | `REGISTRANT_*` (name/address/phone/email) |
| DNS + SSL (edge) | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` |
| Attach host to origin | `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, (`VERCEL_TEAM_ID`) |
| Origin DNS target | `ORIGIN_DNS_TARGET` (defaults to Vercel's `76.76.21.21`) |
| Background provisioner | `CRON_SECRET` (the reconciler cron uses this) |

Get the keys from each provider's dashboard: Namecheap (Profile → Tools → API Access; use the
**sandbox** first), Cloudflare (My Profile → API Tokens, scoped Zone/DNS/SSL edit, + Account ID),
Vercel (Account Settings → Tokens, + the project's ID). Restart the app after editing `.env`
(env is read at startup). Then **Search** and **Buy & provision** work end-to-end.

> Quick test path: set `NAMECHEAP_SANDBOX=true` and use the Namecheap **sandbox** to exercise the
> full buy→live flow without spending money, then flip to production keys for real domains.

---

## TL;DR per landing
Open landing → **Domains** → **Search** a keyword → **Buy & provision** → wait for **live**.
(One domain per landing; use **Rotate** to swap a burned one.) Prereq: the API keys in §4 must be
set in `.env` — that's what the current *"Unexpected error"* is telling you.
