import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const nano21 = customAlphabet(alphabet, 21);

/** Unguessable share token, e.g. `newToken("c")` -> "c_9fK2...". */
export function newToken(prefix: "i" | "c"): string {
  return `${prefix}_${nano21()}`;
}
