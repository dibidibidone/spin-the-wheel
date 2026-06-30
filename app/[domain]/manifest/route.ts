import { getLandingByHost } from "@/lib/tenant";

type Ctx = { params: Promise<{ domain: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { domain } = await ctx.params;
  const view = await getLandingByHost(decodeURIComponent(domain));
  if (!view) return new Response("Not found", { status: 404 });

  const name = view.pwaName || view.texts.heading;
  const icons = view.pwaIconUrl
    ? [
        { src: view.pwaIconUrl, sizes: "192x192", purpose: "any maskable" },
        { src: view.pwaIconUrl, sizes: "512x512", purpose: "any maskable" },
      ]
    : [];

  const manifest = {
    name,
    short_name: name,
    start_url: "/launch",
    scope: "/",
    display: "standalone",
    background_color: view.theme.bg,
    theme_color: view.theme.gold,
    icons,
  };

  return Response.json(manifest, {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
