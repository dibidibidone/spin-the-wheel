export type TemplateKind = "wheel-2d" | "wheel-3d" | "slot";

export function templateKind(template: string): TemplateKind {
  if (template === "classic-2d") return "wheel-2d";
  if (template === "book-of-ra" || template === "gates-of-olympus") return "slot";
  return "wheel-3d"; // jackpot-vault, alchemy-lab
}

export function isWheel(template: string): boolean {
  return templateKind(template) !== "slot";
}
