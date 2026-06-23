import { prisma } from "./db";
import type { LandingView, ThemeColors, WheelSegment } from "./types";


type PrizeRow = { id: string; order: number; label: string; icon: string; color: string; weight: number };
type LandingRow = {
  slug: string; status: string;
  heading: string; subtitle: string; backLabel: string; winTitle: string; claimLabel: string; almostText: string;
  theme: ThemeColors;
  logoUrl: string | null; faviconUrl: string | null; coinImageUrl: string | null; bgImageUrl: string | null;
  spinsBeforeWin: number; redirectUrl: string; redirectPrizeParam: string | null;
  metaTitle: string | null; metaDescription: string | null;
  template: string; pwaName: string; pwaIconUrl: string | null; pwaUrl: string;
  winningPrizeId: string | null;
  winningPrize: PrizeRow | null;
  prizes: PrizeRow[];
};

export function toLandingView(landing: LandingRow): LandingView {
  const segments: WheelSegment[] = [...landing.prizes]
    .sort((a, b) => a.order - b.order)
    .map((p) => ({ id: p.id, order: p.order, label: p.label, icon: p.icon, color: p.color }));
  const winningIndex = segments.findIndex((s) => s.id === landing.winningPrizeId);
  return {
    slug: landing.slug,
    texts: {
      heading: landing.heading, subtitle: landing.subtitle, backLabel: landing.backLabel,
      winTitle: landing.winTitle, claimLabel: landing.claimLabel, almostText: landing.almostText,
    },
    theme: landing.theme,
    assets: {
      logoUrl: landing.logoUrl, faviconUrl: landing.faviconUrl,
      coinImageUrl: landing.coinImageUrl, bgImageUrl: landing.bgImageUrl,
    },
    segments,
    spin: { segmentCount: segments.length, spinsBeforeWin: landing.spinsBeforeWin, winningIndex, behavior: "near-miss" },
    redirectUrl: landing.redirectUrl,
    redirectPrizeParam: landing.redirectPrizeParam,
    winningPrizeLabel: landing.winningPrize?.label ?? "",
    metaTitle: landing.metaTitle ?? landing.heading,
    metaDescription: landing.metaDescription ?? landing.subtitle,
    template: landing.template,
    pwaName: landing.pwaName,
    pwaIconUrl: landing.pwaIconUrl,
    pwaUrl: landing.pwaUrl,
  };
}

export async function getLandingByHost(host: string): Promise<LandingView | null> {
  const hostname = host.toLowerCase();
  const domain = await prisma.domain.findUnique({
    where: { hostname },
    include: { landing: { include: { prizes: true, winningPrize: true } } },
  });
  const landing = domain?.landing as LandingRow | undefined;
  if (!landing || landing.status !== "published" || !landing.winningPrize) return null;
  return toLandingView(landing);
}

export async function getLandingViewById(id: string): Promise<LandingView | null> {
  const landing = await prisma.landing.findUnique({
    where: { id },
    include: { prizes: true, winningPrize: true },
  });
  if (!landing) return null;
  return toLandingView(landing as unknown as Parameters<typeof toLandingView>[0]);
}
