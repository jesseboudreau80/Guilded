import { beforeEach, describe, expect, it, vi } from "vitest";
import { consultationEligibility, BASE_RATE } from "@/lib/consultation";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    consultation: {
      findMany: vi.fn(),
    },
  },
}));

const findMany = vi.mocked(prisma.consultation.findMany);

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function discountedSessions(...purchasedDaysAgo: number[]) {
  return purchasedDaysAgo
    .sort((a, b) => a - b)
    .map((days, i) => ({ id: `c${i}`, purchasedAt: daysAgo(days) })) as never;
}

beforeEach(() => {
  findMany.mockReset();
  findMany.mockResolvedValue(discountedSessions());
});

describe("consultationEligibility", () => {
  it("grants Master the $150 discounted rate when fully eligible", async () => {
    const result = await consultationEligibility("u1", "MASTER", "ACTIVE", 2);
    expect(result.discountedEligible).toBe(true);
    expect(result.price).toBe(15000);
  });

  it("grants Hero the $100 discounted rate when fully eligible", async () => {
    const result = await consultationEligibility("u1", "HERO", "ACTIVE", 5);
    expect(result.discountedEligible).toBe(true);
    expect(result.price).toBe(10000);
  });

  it("denies the discount below Master tier even with an active subscription", async () => {
    const result = await consultationEligibility("u1", "JOURNEYMAN", "ACTIVE", 10);
    expect(result.discountedEligible).toBe(false);
    expect(result.price).toBe(BASE_RATE);
  });

  it("denies the discount without an active subscription", async () => {
    for (const status of ["INACTIVE", "CANCELED", "PAST_DUE"] as const) {
      const result = await consultationEligibility("u1", "HERO", status, 5);
      expect(result.discountedEligible).toBe(false);
      expect(result.price).toBe(BASE_RATE);
    }
  });

  it("requires at least 2 successful billing cycles", async () => {
    expect((await consultationEligibility("u1", "MASTER", "ACTIVE", 0)).discountedEligible).toBe(false);
    expect((await consultationEligibility("u1", "MASTER", "ACTIVE", 1)).discountedEligible).toBe(false);
    expect((await consultationEligibility("u1", "MASTER", "ACTIVE", 2)).discountedEligible).toBe(true);
  });

  it("caps discounted sessions at 4 per rolling 365 days", async () => {
    findMany.mockResolvedValue(discountedSessions(300, 240, 180, 120));
    const result = await consultationEligibility("u1", "HERO", "ACTIVE", 12);
    expect(result.usedDiscountedIn365Days).toBe(4);
    expect(result.discountedEligible).toBe(false);
    expect(result.price).toBe(BASE_RATE);
  });

  it("enforces 60-day spacing since the last discounted session", async () => {
    findMany.mockResolvedValue(discountedSessions(30));
    const blocked = await consultationEligibility("u1", "MASTER", "ACTIVE", 4);
    expect(blocked.discountedEligible).toBe(false);
    expect(blocked.nextEligibleDate).not.toBeNull();

    findMany.mockResolvedValue(discountedSessions(61));
    const allowed = await consultationEligibility("u1", "MASTER", "ACTIVE", 4);
    expect(allowed.discountedEligible).toBe(true);
  });

  it("always reports the tier's discounted rate for display", async () => {
    findMany.mockResolvedValue(discountedSessions(10));
    const result = await consultationEligibility("u1", "HERO", "ACTIVE", 4);
    expect(result.discountedEligible).toBe(false);
    expect(result.price).toBe(BASE_RATE);
    expect(result.discountedPrice).toBe(10000);
  });
});
