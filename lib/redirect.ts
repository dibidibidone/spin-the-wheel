// `redirectUrl` is validated to be an http(s) URL at the CMS write layer
// (lib/admin/validation.ts), so the value reaching window.location.assign here
// cannot carry a javascript:/data: scheme.
export function buildRedirectUrl(
  redirectUrl: string,
  prizeParam: string | null,
  prizeLabel: string,
): string {
  if (!prizeParam) return redirectUrl;
  const sep = redirectUrl.includes("?") ? "&" : "?";
  const value = encodeURIComponent(prizeLabel).replace(/%20/g, "+");
  return `${redirectUrl}${sep}${prizeParam}=${value}`;
}
