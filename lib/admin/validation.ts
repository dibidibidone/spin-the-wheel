import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a 6-digit hex color");
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes");
const url = z
  .string()
  .url("Must be a valid URL")
  .refine((u) => {
    try {
      return /^https?:$/.test(new URL(u).protocol);
    } catch {
      return false;
    }
  }, "Must be an http(s) URL");

export const TEMPLATE_VALUES = [
  "classic-2d",
  "jackpot-vault",
  "alchemy-lab",
  "book-of-ra",
  "gates-of-olympus",
] as const;
export type TemplateId = (typeof TEMPLATE_VALUES)[number];

const themeSchema = z.object({
  bg: hex, surface: hex, accent: hex, gold: hex, text: hex, muted: hex,
});

const patchSchema = z
  .object({
    name: z.string().min(1),
    slug,
    status: z.enum(["draft", "published"]),
    heading: z.string().min(1),
    subtitle: z.string(),
    backLabel: z.string().min(1),
    winTitle: z.string().min(1),
    claimLabel: z.string().min(1),
    almostText: z.string().min(1),
    metaTitle: z.string().nullable(),
    metaDescription: z.string().nullable(),
    theme: themeSchema,
    logoUrl: url.nullable(),
    faviconUrl: url.nullable(),
    coinImageUrl: url.nullable(),
    bgImageUrl: url.nullable(),
    template: z.enum(TEMPLATE_VALUES),
    pwaName: z.string(),
    pwaIconUrl: url.nullable(),
    redirectUrl: url,
    winText: z.string(),
    spinsBeforeWin: z.number().int().min(1),
  })
  .partial()
  .strict();

const wheelPrizeSchema = z.object({
  label: z.string().min(1),
  icon: z.string().default(""),
  color: hex,
  weight: z.number().int().min(0),
});

const wheelSchema = z
  .object({
    spinsBeforeWin: z.number().int().min(1),
    winningIndex: z.number().int().min(0),
    prizes: z.array(wheelPrizeSchema).min(2),
  })
  .refine((v) => v.winningIndex < v.prizes.length, {
    message: "winningIndex is out of range",
    path: ["winningIndex"],
  });

const createSchema = z
  .object({
    name: z.string().min(1),
    template: z.enum(TEMPLATE_VALUES).default("classic-2d"),
  })
  .strict();

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

function parse<S extends z.ZodTypeAny>(schema: S, data: unknown): Parsed<z.infer<S>> {
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, value: result.data };
  return { ok: false, error: result.error.issues[0]?.message ?? "Invalid input" };
}

export const parseLandingPatch = (d: unknown) => parse(patchSchema, d);
export const parseWheelInput = (d: unknown) => parse(wheelSchema, d);
export const parseCreateLanding = (d: unknown) => parse(createSchema, d);

export type LandingPatch = z.infer<typeof patchSchema>;
export type WheelInput = z.infer<typeof wheelSchema>;
export type CreateLandingInput = z.infer<typeof createSchema>;
