import { describe, expect, it } from "vitest";
import { AI_LIMITS, TIER_LEVEL, canAccess } from "@/lib/tiers";

describe("canAccess", () => {
  it("allows access at or above the required tier", () => {
    expect(canAccess("APPRENTICE", "APPRENTICE")).toBe(true);
    expect(canAccess("JOURNEYMAN", "APPRENTICE")).toBe(true);
    expect(canAccess("MASTER", "JOURNEYMAN")).toBe(true);
    expect(canAccess("HERO", "MASTER")).toBe(true);
    expect(canAccess("HERO", "HERO")).toBe(true);
  });

  it("blocks access below the required tier", () => {
    expect(canAccess("APPRENTICE", "JOURNEYMAN")).toBe(false);
    expect(canAccess("JOURNEYMAN", "MASTER")).toBe(false);
    expect(canAccess("MASTER", "HERO")).toBe(false);
  });

  it("keeps tier levels strictly ordered", () => {
    expect(TIER_LEVEL.APPRENTICE).toBeLessThan(TIER_LEVEL.JOURNEYMAN);
    expect(TIER_LEVEL.JOURNEYMAN).toBeLessThan(TIER_LEVEL.MASTER);
    expect(TIER_LEVEL.MASTER).toBeLessThan(TIER_LEVEL.HERO);
  });
});

describe("AI limits", () => {
  it("gives Apprentice no AI access", () => {
    expect(AI_LIMITS.APPRENTICE.messages).toBe(0);
    expect(AI_LIMITS.APPRENTICE.maxTokens).toBe(0);
  });

  it("scales message caps with tier", () => {
    expect(AI_LIMITS.JOURNEYMAN.messages).toBe(15);
    expect(AI_LIMITS.MASTER.messages).toBe(100);
    expect(AI_LIMITS.HERO.messages).toBe(300);
    expect(AI_LIMITS.JOURNEYMAN.messages).toBeLessThan(AI_LIMITS.MASTER.messages);
    expect(AI_LIMITS.MASTER.messages).toBeLessThan(AI_LIMITS.HERO.messages);
  });
});
