import type { ItemType } from "@/lib/types";

export type Asset = {
  id: string;
  name: string;
  type: ItemType;
  kind: "image" | "video";
  url: string;
  slideGroup?: string;
  slideOrder: number;
  posterUrl?: string;
  webPlayable?: boolean;
};

export type SourceConfig = Record<string, unknown>;

export interface Source {
  list(): Promise<Asset[]>;
}
