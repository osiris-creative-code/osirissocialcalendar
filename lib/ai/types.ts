import type { ItemType } from "@/lib/types";

export type CaptionRequest = {
  brandName: string;
  tone: string;
  items: { date: string; type: ItemType; specialLabel: string | null }[];
};

export type CaptionResult = {
  /** Same length and order as `request.items`; `null` for story items. */
  captions: (string | null)[];
};

export interface AIClient {
  captions(req: CaptionRequest): Promise<CaptionResult>;
}
