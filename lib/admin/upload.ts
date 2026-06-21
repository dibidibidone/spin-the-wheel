const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
];
const MAX_BYTES = 2 * 1024 * 1024;

export function validateUpload(file: { type: string; size: number }): { ok: true } | { ok: false; error: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, error: `Unsupported file type: ${file.type || "unknown"}` };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "File exceeds the 2 MB limit" };
  }
  return { ok: true };
}
