/**
 * Pre-filled WhatsApp deep link. Opens WhatsApp (app or web) with the message
 * already typed; the user presses send. No API, no cost, no server call.
 */
export function waLink({ phone, text }: { phone?: string | null; text: string }): string {
  if (!text.trim()) throw new Error("waLink: text required");
  const digits = (phone ?? "").replace(/\D/g, "");
  const base = digits ? `https://wa.me/${digits}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}
