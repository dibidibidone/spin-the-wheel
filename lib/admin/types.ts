import type { ThemeColors } from "@/lib/types";

export type EditablePrize = {
  id: string;
  order: number;
  label: string;
  icon: string;
  color: string;
  weight: number;
};

export type EditableLanding = {
  id: string;
  slug: string;
  name: string;
  status: "draft" | "published";
  heading: string;
  subtitle: string;
  backLabel: string;
  winTitle: string;
  claimLabel: string;
  almostText: string;
  winText: string;
  template: string;
  pwaName: string;
  pwaIconUrl: string | null;
  theme: ThemeColors;
  logoUrl: string | null;
  faviconUrl: string | null;
  coinImageUrl: string | null;
  bgImageUrl: string | null;
  spinsBeforeWin: number;
  redirectUrl: string;
  redirectPrizeParam: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  winningPrizeId: string | null;
  prizes: EditablePrize[];
};

export type LandingListItem = {
  id: string;
  name: string;
  slug: string;
  status: string;
  domainCount: number;
};
