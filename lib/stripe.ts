import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia",
});

export const STRIPE_PRICE_IDS: Record<string, string> = {
  JOURNEYMAN: process.env.STRIPE_PRICE_JOURNEYMAN!,
  MASTER: process.env.STRIPE_PRICE_MASTER!,
  HERO: process.env.STRIPE_PRICE_HERO!,
};
