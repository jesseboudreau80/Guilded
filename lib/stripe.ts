import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
});

export const SUBSCRIPTION_PRICE_IDS = {
  JOURNEYMAN: process.env.STRIPE_PRICE_JOURNEYMAN || "",
  MASTER: process.env.STRIPE_PRICE_MASTER || "",
  HERO: process.env.STRIPE_PRICE_HERO || "",
};
