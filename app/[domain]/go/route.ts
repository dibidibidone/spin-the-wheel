import { getLandingByHost } from "@/lib/tenant";

type Ctx = { params: Promise<{ domain: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { domain } = await ctx.params;
  const view = await getLandingByHost(decodeURIComponent(domain));
  const target = view?.pwaUrl || view?.redirectUrl;
  if (!target) return new Response("Not found", { status: 404 });
  return Response.redirect(target, 302);
}
