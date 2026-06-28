import { requireApiSession } from "@/lib/admin/guard";
import { validateUpload } from "@/lib/admin/upload";
import { storeUpload } from "@/lib/admin/storage";

export async function POST(req: Request) {
  const guard = await requireApiSession();
  if (!guard.ok) return guard.response;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const check = validateUpload({ type: file.type, size: file.size });
  if (!check.ok) return Response.json({ error: check.error }, { status: 400 });

  const stored = await storeUpload(file);
  return Response.json({ url: stored.url });
}
