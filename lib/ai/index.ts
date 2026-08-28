import type { AIClient } from "./types";
import { MockAI } from "./mock";
import { AnthropicAI } from "./anthropic";

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

/** Real Claude client when ANTHROPIC_API_KEY is set, deterministic MockAI otherwise. */
export function getAI(): AIClient {
  if (!instance) {
    instance = process.env.ANTHROPIC_API_KEY ? new AnthropicAI() : new MockAI();
  }
  return instance;
}

export function aiIsLive(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}
