import OpenAI from "openai";

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const EDUCATIONAL_DISCLAIMER =
  "This content is provided for educational purposes only and does not constitute legal advice.";
