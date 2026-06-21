import type { Session } from "next-auth";
import { auth } from "@/lib/auth";

export type GuardResult =
  | { ok: true; session: Session }
  | { ok: false; response: Response };

export async function requireApiSession(): Promise<GuardResult> {
  const session = await auth();
  if (!session) {
    return { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { ok: true, session };
}
