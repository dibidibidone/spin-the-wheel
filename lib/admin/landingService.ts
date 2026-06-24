import { prisma } from "@/lib/db";
import { boomzinoTheme } from "@/prisma/seedData";
import type { EditableLanding, EditablePrize, LandingListItem } from "@/lib/admin/types";
import type { CreateLandingInput, LandingPatch, WheelInput } from "@/lib/admin/validation";
import type { ThemeColors } from "@/lib/types";

const DEFAULT_PRIZES = [
  { label: "€5", icon: "💶", color: "#1E7A3A", weight: 30 },
  { label: "50 FS", icon: "🎰", color: "#2BA552", weight: 25 },
  { label: "€10", icon: "💶", color: "#1E7A3A", weight: 20 },
  { label: "100 FS", icon: "🎰", color: "#2BA552", weight: 12 },
  { label: "€20", icon: "💶", color: "#1E7A3A", weight: 8 },
  { label: "JACKPOT", icon: "👑", color: "#F5C24B", weight: 1 },
];

// Template-appropriate starting point applied at creation. The winning prize's
// label (the "you won X" text) and the PWA app name differ per template; the
// classic-2d preset reproduces the historical defaults so 2D creation is unchanged.
type TemplatePreset = {
  heading: string;
  subtitle: string;
  winTitle: string;
  claimLabel: string;
  winnerLabel: string;
  pwaName: string;
  winText: string; // slot win-prize text ("" for wheels — their prize comes from the rows)
};

const TEMPLATE_PRESETS: Record<string, TemplatePreset> = {
  "classic-2d": {
    heading: "Spin the Wheel", subtitle: "and win bonuses",
    winTitle: "You won {prize}!", claimLabel: "Claim", winnerLabel: "JACKPOT", pwaName: "", winText: "",
  },
  "jackpot-vault": {
    heading: "BOOM your luck", subtitle: "Spin the vault to win",
    winTitle: "JACKPOT — you won!", claimLabel: "Claim jackpot →", winnerLabel: "1,000 Free Spins", pwaName: "Jackpot Vault", winText: "",
  },
  "alchemy-lab": {
    heading: "Brew your fortune", subtitle: "Spin the alchemy wheel",
    winTitle: "The potion paid out!", claimLabel: "Claim your bonus →", winnerLabel: "500 Free Spins", pwaName: "Alchemy Lab", winText: "",
  },
  "book-of-ra": {
    heading: "Unearth the Book", subtitle: "Spin to reveal riches",
    winTitle: "Riches revealed!", claimLabel: "Claim your bonus →", winnerLabel: "200 Free Spins", pwaName: "Book of Ra", winText: "200 Free Spins",
  },
  "gates-of-olympus": {
    heading: "Summon the gods", subtitle: "Spin for divine wins",
    winTitle: "The gods reward you!", claimLabel: "Claim your bonus →", winnerLabel: "500 Free Spins + ×500", pwaName: "Gates of Olympus", winText: "500 Free Spins + ×500",
  },
};

export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "landing";
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let n = 1;
  while (await prisma.landing.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

export async function listLandings(): Promise<LandingListItem[]> {
  const rows = await prisma.landing.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { domains: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    status: r.status,
    domainCount: r._count.domains,
  }));
}

export async function createLanding(input: CreateLandingInput): Promise<{ id: string }> {
  const preset = TEMPLATE_PRESETS[input.template] ?? TEMPLATE_PRESETS["classic-2d"];
  const slug = await uniqueSlug(slugify(input.name));
  // The last default prize is the winner — give it the template's prize text.
  const prizes = DEFAULT_PRIZES.map((p, i) =>
    i === DEFAULT_PRIZES.length - 1 ? { ...p, label: preset.winnerLabel } : p,
  );
  const landing = await prisma.landing.create({
    data: {
      slug,
      name: input.name,
      status: "draft",
      template: input.template,
      heading: preset.heading,
      subtitle: preset.subtitle,
      winTitle: preset.winTitle,
      claimLabel: preset.claimLabel,
      pwaName: preset.pwaName,
      winText: preset.winText,
      theme: boomzinoTheme,
      spinsBeforeWin: 3,
      redirectUrl: "https://example.com",
      prizes: { create: prizes.map((p, i) => ({ ...p, order: i })) },
    },
    include: { prizes: { orderBy: { order: "asc" } } },
  });

  const winner = landing.prizes[landing.prizes.length - 1];
  await prisma.landing.update({ where: { id: landing.id }, data: { winningPrizeId: winner.id } });
  return { id: landing.id };
}

export async function getEditableLanding(id: string): Promise<EditableLanding | null> {
  const l = await prisma.landing.findUnique({
    where: { id },
    include: { prizes: { orderBy: { order: "asc" } } },
  });
  if (!l) return null;

  const prizes: EditablePrize[] = l.prizes.map((p) => ({
    id: p.id, order: p.order, label: p.label, icon: p.icon, color: p.color, weight: p.weight,
  }));

  return {
    id: l.id,
    slug: l.slug,
    name: l.name,
    status: l.status as "draft" | "published",
    heading: l.heading,
    subtitle: l.subtitle,
    backLabel: l.backLabel,
    winTitle: l.winTitle,
    claimLabel: l.claimLabel,
    almostText: l.almostText,
    winText: l.winText,
    template: l.template,
    pwaName: l.pwaName,
    pwaIconUrl: l.pwaIconUrl,
    theme: l.theme as ThemeColors,
    logoUrl: l.logoUrl,
    faviconUrl: l.faviconUrl,
    coinImageUrl: l.coinImageUrl,
    bgImageUrl: l.bgImageUrl,
    spinsBeforeWin: l.spinsBeforeWin,
    redirectUrl: l.redirectUrl,
    redirectPrizeParam: l.redirectPrizeParam,
    metaTitle: l.metaTitle,
    metaDescription: l.metaDescription,
    winningPrizeId: l.winningPrizeId,
    prizes,
  };
}

// Metadata-only save (texts, theme, slug, status, asset URLs). The winning prize
// and wheel/prize config are owned by saveWheel(); `LandingPatch` is a strict
// schema that excludes winningPrizeId, so this passthrough cannot repoint the winner.
export async function updateLanding(id: string, patch: LandingPatch): Promise<void> {
  await prisma.landing.update({ where: { id }, data: patch });
}

export async function saveWheel(id: string, input: WheelInput): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.landing.update({ where: { id }, data: { winningPrizeId: null } });
    await tx.prize.deleteMany({ where: { landingId: id } });
    await tx.prize.createMany({
      data: input.prizes.map((p, i) => ({
        landingId: id, order: i, label: p.label, icon: p.icon, color: p.color, weight: p.weight,
      })),
    });
    const created = await tx.prize.findMany({ where: { landingId: id }, orderBy: { order: "asc" } });
    const winner = created[input.winningIndex];
    await tx.landing.update({
      where: { id },
      data: {
        winningPrizeId: winner.id,
        spinsBeforeWin: input.spinsBeforeWin,
        redirectUrl: input.redirectUrl,
        redirectPrizeParam: input.redirectPrizeParam,
      },
    });
  });
}
