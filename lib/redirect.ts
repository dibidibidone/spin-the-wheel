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
