import type { AIClient } from "./types";
import { MockAI } from "./mock";
import { AnthropicAI } from "./anthropic";
import { OpenAIAI } from "./openai";

export type {
  AIClient,
  CaptionRequest,
  CaptionResult,
  CaptionItem,
  RewriteRequest,
  AnalyzeFeedRequest,
  AnalyzeFeedResult,
} from "./types";
export { MockAI } from "./mock";

let instance: AIClient | null = null;

export type AIProvider = "openai" | "anthropic" | "mock";

export function aiProvider(): AIProvider {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "mock";
}

/** Picks OpenAI, then Claude, then the deterministic MockAI — by which key is set. */
export function getAI(): AIClient {
  if (!instance) {
    const p = aiProvider();
    instance = p === "openai" ? new OpenAIAI() : p === "anthropic" ? new AnthropicAI() : new MockAI();
  }
  return instance;
}

export function aiIsLive(): boolean {
  return aiProvider() !== "mock";
}
