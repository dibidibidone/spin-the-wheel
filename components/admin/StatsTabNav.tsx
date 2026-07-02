"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Top-level admin sections. "Statistics" is active only under /admin/stats; everything else
// under the panel (the landings list + the per-landing editor) belongs to "Landings".
export function StatsTabNav() {
  const pathname = usePathname() ?? "";
  const onStats = pathname.startsWith("/admin/stats");
  return (
    <nav className="tabs">
      <Link href="/admin" className={onStats ? "tab" : "tab active"}>Landings</Link>
      <Link href="/admin/stats" className={onStats ? "tab active" : "tab"}>Statistics</Link>
    </nav>
  );
}
