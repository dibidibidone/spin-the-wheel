import type { ReactNode } from "react";
import { requireAdminSession } from "@/lib/auth/session";

export default async function PreviewLayout({ children }: { children: ReactNode }) {
  await requireAdminSession();
  return <>{children}</>;
}
