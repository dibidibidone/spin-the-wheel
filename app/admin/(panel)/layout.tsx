import type { ReactNode } from "react";
import Link from "next/link";
import { requireAdminSession } from "@/lib/auth/session";
import { signOut } from "@/lib/auth";
import "../admin.css";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  await requireAdminSession();
  return (
    <div className="admin">
      <header className="admin-bar">
        <Link href="/admin" className="admin-brand">Spin CMS</Link>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/admin/login" });
          }}
        >
          <button className="admin-signout" type="submit">Sign out</button>
        </form>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
