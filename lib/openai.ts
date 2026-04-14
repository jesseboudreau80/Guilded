import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const AI_DISCLAIMER =
  "⚠️ Educational Disclaimer: This content is provided for educational purposes only and does not constitute legal, financial, or professional credit advice. Results vary and nothing here guarantees specific outcomes. Always consult a qualified professional for personalized guidance.";
