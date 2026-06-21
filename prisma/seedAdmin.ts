import { hashPassword } from "@/lib/auth/password";

type AdminUpsertClient = {
  admin: {
    upsert: (args: {
      where: { email: string };
      create: { email: string; passwordHash: string };
      update: { passwordHash: string };
    }) => Promise<unknown>;
  };
};

export async function seedAdmin(
  client: AdminUpsertClient,
  email: string,
  password: string,
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const passwordHash = await hashPassword(password);
  await client.admin.upsert({
    where: { email: normalized },
    create: { email: normalized, passwordHash },
    update: { passwordHash },
  });
}
