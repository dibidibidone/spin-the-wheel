import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";

export async function requireAdminSession(): Promise<Session> {
  const session = await auth();
  if (!session) redirect("/admin/login");
  return session;
}
