import NextAuth from "next-auth";
import type { Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { authorizeAdmin } from "@/lib/auth/authorize";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: (creds) =>
        authorizeAdmin(creds, {
          findAdmin: (email) => prisma.admin.findUnique({ where: { email } }),
          verify: verifyPassword,
        }),
    }),
  ],
});

/** Returns the current session's user object, or null if not authenticated. */
export async function requireAdmin(): Promise<Session["user"] | null> {
  const session = await auth();
  return session?.user ?? null;
}
