export type HostRoute = { kind: "pass" } | { kind: "rewrite"; path: string };

export function decideHostRoute(
  host: string | null,
  pathname: string,
  adminHost: string | undefined,
): HostRoute {
  if (!host) return { kind: "pass" };
  if (adminHost && host === adminHost) return { kind: "pass" };
  return { kind: "rewrite", path: `/${host}${pathname}` };
}
