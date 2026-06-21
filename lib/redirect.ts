// SECURITY (Plan 2): `redirectUrl` is trusted seed data in Plan 1. When the CMS
// makes it admin-editable, validate it is an http(s) URL before navigating —
// a `javascript:` URL passed to window.location.assign would execute (open
// redirect / stored XSS).
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
