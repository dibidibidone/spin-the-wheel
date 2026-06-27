import { describe, it, expect } from "vitest";
import { jackpotCopy, jackpotConversion } from "./jackpot/theme";
import { alchemyCopy, alchemyConversion } from "./alchemy/theme";
import { bookOfRaCopy, bookOfRaConversion } from "./slots/book-of-ra/theme";
import { gatesCopy, gatesConversion } from "./slots/gates-of-olympus/theme";

describe("theme offer copy", () => {
  it("every theme has an offer headline + scarcity total", () => {
    for (const [copy, conv] of [
      [jackpotCopy, jackpotConversion],
      [alchemyCopy, alchemyConversion],
      [bookOfRaCopy, bookOfRaConversion],
      [gatesCopy, gatesConversion],
    ] as const) {
      expect(copy.offerHeadline && copy.offerHeadline.length).toBeTruthy();
      expect(conv.scarcity?.total).toBeGreaterThan(0);
    }
  });

  it("every theme has an offer subline", () => {
    for (const copy of [jackpotCopy, alchemyCopy, bookOfRaCopy, gatesCopy]) {
      expect(copy.offerSubline && copy.offerSubline.length).toBeTruthy();
    }
  });

  it("alchemy has real themed copy (not generic defaults)", () => {
    expect(alchemyCopy.heading).toBe("Brew your fortune");
    expect(alchemyCopy.subtitle).toBe("Mix the potion, win the bonus");
    expect(alchemyCopy.offerHeadline).toBe("Win up to €500");
    expect(alchemyCopy.offerSubline).toBe("+ 150 Free Spins");
    expect(alchemyConversion.scarcity?.total).toBe(40);
  });

  it("exact scarcity totals per theme", () => {
    expect(jackpotConversion.scarcity?.total).toBe(50);
    expect(alchemyConversion.scarcity?.total).toBe(40);
    expect(bookOfRaConversion.scarcity?.total).toBe(45);
    expect(gatesConversion.scarcity?.total).toBe(60);
  });
});
