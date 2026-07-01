import { requireApiSession } from "@/lib/admin/guard";
import { getFunnelStats } from "@/lib/admin/statsService";

export async function GET(req: Request): Promise<Response> {
  const guard = await requireApiSession();
  if (!guard.ok) return guard.response;

  const params = new URL(req.url).searchParams;
  const landingIdParam = params.get("landingId");
  const fromStr = params.get("from");
  const toStr = params.get("to");

  const from = fromStr ? new Date(fromStr) : undefined;
  const to = toStr ? new Date(toStr) : undefined;
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
    return Response.json({ error: "Invalid date" }, { status: 400 });
  }

  const stats = await getFunnelStats({
    landingId: landingIdParam && landingIdParam !== "all" ? landingIdParam : undefined,
    from,
    to,
  });
  return Response.json(stats);
}
