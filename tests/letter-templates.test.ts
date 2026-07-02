import { describe, expect, it } from "vitest";
import { letterTemplates } from "@/content/letter-templates";
import { TIER_LEVEL } from "@/lib/tiers";

// The Horkos rule: templates must never promise outcomes. These phrases are
// the CROA-adjacent language that gets credit-repair products in trouble.
const FORBIDDEN_PHRASES = [
  /guarantee/i,
  /we will (remove|delete|erase)/i,
  /promise to (remove|delete|fix|raise)/i,
  /erase your (debt|credit)/i,
  /raise your score/i,
  /100% (removal|success)/i,
  /new credit identity/i,
  /credit privacy number/i,
  /\bCPN\b/,
];

describe("letter templates", () => {
  it("covers the core letter types", () => {
    const slugs = letterTemplates.map((t) => t.slug);
    for (const required of [
      "bureau-dispute",
      "furnisher-dispute",
      "debt-validation",
      "goodwill-request",
      "identity-theft-block",
      "cease-communication",
      "settlement-offer",
      "pre-arbitration-notice",
    ]) {
      expect(slugs).toContain(required);
    }
    expect(new Set(slugs).size).toBe(letterTemplates.length);
  });

  it.each(letterTemplates.map((t) => [t.slug, t] as const))(
    "%s has usable structure",
    (_slug, template) => {
      expect(TIER_LEVEL[template.requiredTier]).toBeGreaterThanOrEqual(TIER_LEVEL.JOURNEYMAN);
      expect(template.whenToUse.length).toBeGreaterThan(40);
      expect(template.tips.length).toBeGreaterThanOrEqual(2);
      // Every template must have fill-in placeholders the user replaces.
      expect(template.body).toMatch(/\[[A-Z][A-Z0-9 ,'/().§—–-]+\]/);
      expect(template.body.split(/\s+/).length).toBeGreaterThan(80);
    }
  );

  it.each(letterTemplates.map((t) => [t.slug, t] as const))(
    "%s never promises outcomes (Horkos rule)",
    (_slug, template) => {
      const text = `${template.whenToUse}\n${template.body}\n${template.tips.join("\n")}`;
      for (const phrase of FORBIDDEN_PHRASES) {
        expect(text, `forbidden phrase ${phrase} in ${template.slug}`).not.toMatch(phrase);
      }
    }
  );

  it("cites the right statute in each legal template", () => {
    const bySlug = Object.fromEntries(letterTemplates.map((t) => [t.slug, t.body]));
    expect(bySlug["bureau-dispute"]).toMatch(/611/);
    expect(bySlug["furnisher-dispute"]).toMatch(/623/);
    expect(bySlug["debt-validation"]).toMatch(/809|1692g/);
    expect(bySlug["identity-theft-block"]).toMatch(/605B/);
    expect(bySlug["cease-communication"]).toMatch(/805|1692c/);
  });

  it("keeps settlement and arbitration templates behind Master", () => {
    for (const slug of ["settlement-offer", "pre-arbitration-notice"]) {
      const template = letterTemplates.find((t) => t.slug === slug)!;
      expect(TIER_LEVEL[template.requiredTier]).toBeGreaterThanOrEqual(TIER_LEVEL.MASTER);
    }
  });
});
