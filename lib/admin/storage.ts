import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

// Store an uploaded image and return its public URL. When BLOB_READ_WRITE_TOKEN is set
// (production / Vercel) it goes to Vercel Blob; otherwise it falls back to the local
// filesystem under public/uploads (so uploads work in local dev without any token).
export async function storeUpload(file: File): Promise<{ url: string }> {
  const safeName = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`landings/${safeName}`, file, { access: "public" });
    return { url: blob.url };
  }

  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, safeName), Buffer.from(await file.arrayBuffer()));
  return { url: `/uploads/${safeName}` };
}
