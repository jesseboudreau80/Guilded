import { Tier, SubscriptionStatus } from "@prisma/client";

export { Tier, SubscriptionStatus };

export const TIER_ORDER: Record<Tier, number> = {
  APPRENTICE: 0,
  JOURNEYMAN: 1,
  MASTER: 2,
  HERO: 3,
};

export const TIER_DISPLAY: Record<Tier, string> = {
  APPRENTICE: "Apprentice",
  JOURNEYMAN: "Journeyman",
  MASTER: "Master",
  HERO: "Hero",
};

export const TIER_PRICES: Record<Tier, number> = {
  APPRENTICE: 0,
  JOURNEYMAN: 900,  // $9.00 in cents
  MASTER: 3900,     // $39.00 in cents
  HERO: 7900,       // $79.00 in cents
};

export const AI_MESSAGE_LIMITS: Record<Tier, number> = {
  APPRENTICE: 0,
  JOURNEYMAN: 15,
  MASTER: 100,
  HERO: 300,
};

export const AI_TOKEN_LIMITS: Record<Tier, number> = {
  APPRENTICE: 0,
  JOURNEYMAN: 500,
  MASTER: 2000,
  HERO: 8000,
};

export const CONSULTATION_PRICES: Record<Tier, number> = {
  APPRENTICE: 20000,  // $200.00 in cents
  JOURNEYMAN: 20000,  // $200.00 in cents
  MASTER: 15000,      // $150.00 in cents
  HERO: 10000,        // $100.00 in cents
};

export const STANDARD_CONSULTATION_PRICE = 20000; // $200 in cents

// Discount eligibility thresholds
export const DISCOUNT_MIN_BILLING_CYCLES = 2;
export const DISCOUNT_MAX_SESSIONS_PER_YEAR = 4;
export const DISCOUNT_MIN_DAYS_BETWEEN_SESSIONS = 60;

export type TierInfo = {
  tier: Tier;
  label: string;
  price: number;
  features: string[];
  aiLimit: number;
  highlighted?: boolean;
};

export const TIER_INFO: TierInfo[] = [
  {
    tier: "APPRENTICE",
    label: "Apprentice",
    price: 0,
    aiLimit: 0,
    features: [
      "Intro credit literacy modules",
      "Limited templates",
      "No AI access",
      "Community access",
    ],
  },
  {
    tier: "JOURNEYMAN",
    label: "Journeyman",
    price: 9,
    aiLimit: 15,
    features: [
      "Full core LMS",
      "All templates",
      "AI assistant (15 msgs/mo)",
      "Community access",
    ],
  },
  {
    tier: "MASTER",
    label: "Master",
    price: 39,
    aiLimit: 100,
    highlighted: true,
    features: [
      "Everything in Journeyman",
      "Arbitration module unlocked",
      "AI assistant (100 msgs/mo)",
      "Discounted strategy sessions ($150)",
    ],
  },
  {
    tier: "HERO",
    label: "Hero",
    price: 79,
    aiLimit: 300,
    features: [
      "Everything unlocked",
      "AI assistant (300 msgs/mo)",
      "Discounted strategy sessions ($100)",
      "Advanced automation (coming soon)",
    ],
  },
];

export interface ConsultationEligibility {
  eligible: boolean;
  discountedPrice: number | null;
  standardPrice: number;
  reason?: string;
  sessionsUsed: number;
  sessionsRemaining: number;
  nextEligibleDate: Date | null;
}
