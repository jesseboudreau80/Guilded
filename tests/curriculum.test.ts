import { describe, expect, it } from "vitest";
import { LEGAL_EDUCATION_NOTE, curriculum } from "@/content/curriculum";
import { TIER_LEVEL } from "@/lib/tiers";

// Modules whose lessons touch legal process must carry the education-only note.
const LEGAL_MODULES = ["disputes", "collections", "bankruptcy", "arbitration"];

describe("curriculum", () => {
  it("covers the full product surface", () => {
    const slugs = curriculum.map((m) => m.slug);
    expect(slugs).toContain("foundations");
    expect(slugs).toContain("disputes");
    expect(slugs).toContain("collections");
    expect(slugs).toContain("bankruptcy");
    expect(slugs).toContain("arbitration");
    expect(slugs).toContain("rebuilding");
  });

  it("has unique, sequential module orders and unique slugs", () => {
    const orders = curriculum.map((m) => m.order).sort((a, b) => a - b);
    expect(orders).toEqual(Array.from({ length: curriculum.length }, (_, i) => i + 1));
    expect(new Set(curriculum.map((m) => m.slug)).size).toBe(curriculum.length);
  });

  it("uses valid tiers and keeps a free on-ramp", () => {
    for (const mod of curriculum) {
      expect(TIER_LEVEL[mod.requiredTier]).toBeGreaterThanOrEqual(0);
    }
    const free = curriculum.filter((m) => m.requiredTier === "APPRENTICE");
    expect(free.length).toBeGreaterThanOrEqual(1);
  });

  it("has unique lesson slugs and substantive content in every lesson", () => {
    for (const mod of curriculum) {
      expect(mod.lessons.length).toBeGreaterThanOrEqual(3);
      expect(new Set(mod.lessons.map((l) => l.slug)).size).toBe(mod.lessons.length);
      for (const lesson of mod.lessons) {
        expect(lesson.title.length).toBeGreaterThan(5);
        // Real lesson bodies, not placeholders.
        expect(lesson.content.split(/\s+/).length).toBeGreaterThan(150);
        expect(lesson.content).not.toMatch(/lorem ipsum|placeholder|TODO/i);
      }
    }
  });

  it("carries the legal-education note on every legal-process lesson", () => {
    for (const mod of curriculum.filter((m) => LEGAL_MODULES.includes(m.slug))) {
      for (const lesson of mod.lessons) {
        expect(lesson.content, `${mod.slug}/${lesson.slug} missing legal note`).toContain(LEGAL_EDUCATION_NOTE);
      }
    }
  });

  it("gates advanced legal content behind paid tiers", () => {
    const bankruptcy = curriculum.find((m) => m.slug === "bankruptcy");
    const arbitration = curriculum.find((m) => m.slug === "arbitration");
    expect(TIER_LEVEL[bankruptcy!.requiredTier]).toBeGreaterThanOrEqual(TIER_LEVEL.MASTER);
    expect(TIER_LEVEL[arbitration!.requiredTier]).toBeGreaterThanOrEqual(TIER_LEVEL.MASTER);
  });

  it("teaches AI-assisted preparation in the arbitration module", () => {
    const arbitration = curriculum.find((m) => m.slug === "arbitration");
    const aiLesson = arbitration!.lessons.find((l) => /AI/i.test(l.title));
    expect(aiLesson).toBeDefined();
    expect(aiLesson!.content).toMatch(/verif/i);
  });

  it("references the sample credit reports where they teach best", () => {
    const all = curriculum.flatMap((m) => m.lessons.map((l) => l.content)).join("\n");
    expect(all).toContain("bankruptcy-ch7");
  });
});
