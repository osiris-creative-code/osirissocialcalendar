import { customAlphabet } from "nanoid";

const nano12 = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 12);

/** Short row id. */
export function newId(): string {
  return nano12();
}

export { newToken } from "./tokens";
