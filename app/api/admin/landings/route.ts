import { requireApiSession } from "@/lib/admin/guard";
import { listLandings, createLanding } from "@/lib/admin/landingService";
import { parseCreateLanding } from "@/lib/admin/validation";

export async function GET() {
  const guard = await requireApiSession();
  if (!guard.ok) return guard.response;
  return Response.json(await listLandings());
}

export async function POST(req: Request) {
  const guard = await requireApiSession();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);
  const parsed = parseCreateLanding(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  const created = await createLanding(parsed.value);
  return Response.json(created, { status: 201 });
}
