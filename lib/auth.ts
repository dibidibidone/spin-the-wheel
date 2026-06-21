import NextAuth from "next-auth";
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
