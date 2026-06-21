export type AdminRecord = { id: string; email: string; passwordHash: string };

export type AuthorizeDeps = {
  findAdmin: (email: string) => Promise<AdminRecord | null>;
  verify: (plain: string, hash: string) => Promise<boolean>;
};

export async function authorizeAdmin(
  raw: Partial<Record<"email" | "password", unknown>> | undefined,
  deps: AuthorizeDeps,
): Promise<{ id: string; email: string } | null> {
  const email = String(raw?.email ?? "").trim().toLowerCase();
  const password = String(raw?.password ?? "");
  if (!email || !password) return null;

  const admin = await deps.findAdmin(email);
  if (!admin) return null;

  const ok = await deps.verify(password, admin.passwordHash);
  return ok ? { id: admin.id, email: admin.email } : null;
}
