import { requireApiSession } from "@/lib/admin/guard";
import { saveWheel } from "@/lib/admin/landingService";
import { parseWheelInput } from "@/lib/admin/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const guard = await requireApiSession();
  if (!guard.ok) return guard.response;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = parseWheelInput(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  await saveWheel(id, parsed.value);
  return Response.json({ ok: true });
}
