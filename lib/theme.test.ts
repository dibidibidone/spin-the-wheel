import { describe, it, expect } from "vitest";
import { themeToCssVars } from "@/lib/theme";
import type { ThemeColors } from "@/lib/types";

const theme: ThemeColors = {
  bg: "#0A1410", surface: "#13251A", accent: "#27C24C",
  gold: "#F5C24B", text: "#EAF6EE", muted: "#7FA88E",
};

describe("themeToCssVars", () => {
  it("maps every theme color to its CSS variable", () => {
    expect(themeToCssVars(theme)).toEqual({
      "--bg": "#0A1410", "--surface": "#13251A", "--accent": "#27C24C",
      "--gold": "#F5C24B", "--text": "#EAF6EE", "--muted": "#7FA88E",
    });
  });

  it("returns exactly six variables", () => {
    expect(Object.keys(themeToCssVars(theme))).toHaveLength(6);
  });
});
