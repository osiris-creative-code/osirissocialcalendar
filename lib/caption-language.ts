import type { Brand, CaptionLanguage } from "@/lib/types";

export const CAPTION_LANGUAGE_LABELS: Record<CaptionLanguage, string> = {
  tr: "Türkçe",
  en: "İngilizce",
  mixed: "Türkçe + İngilizce",
};

/** Brands created before this setting existed default to Turkish. */
export function captionLanguageOf(brand: Pick<Brand, "captionLanguage">): CaptionLanguage {
  return brand.captionLanguage ?? "tr";
}

/** The instruction handed to the model. Kept here so every AI call words it the same. */
export function captionLanguageRule(lang: CaptionLanguage): string {
  if (lang === "en") return "Caption'ları İNGİLİZCE yaz. Türkçe kullanma.";
  if (lang === "mixed") {
    return "Caption'ları Türkçe yaz, ama İngilizce bir kısa cümle veya hashtag harmanlayabilirsin.";
  }
  return "Caption'ları TÜRKÇE yaz.";
}
