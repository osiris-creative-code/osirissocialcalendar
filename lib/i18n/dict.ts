import type { Language } from "@/lib/types";

/**
 * UI strings, Turkish first because that is what the team speaks.
 *
 * Only chrome lives here — brand names, captions and the notes people type stay
 * in whatever language they were written in, and caption language is a separate
 * per-brand setting.
 */
export const DICT = {
  tr: {
    "nav.brands": "Markalar",
    "nav.queue": "Onay kuyruğu",
    "nav.guide": "Rehber",
    "nav.developer": "Geliştirici",
    "action.save": "Kaydet",
    "action.cancel": "Vazgeç",
    "action.edit": "Düzenle",
    "action.delete": "Sil",
    "action.approve": "Onayla",
    "action.revise": "Revize iste",
    "action.generate": "Takvimi üret",
    "action.regenerate": "Yeniden üret",
    "action.sendInternal": "İç onaya gönder",
    "view.calendar": "Takvim",
    "view.list": "Liste",
    "type.post": "Post",
    "type.story": "Story",
    "type.reel": "Reels",
    "type.special": "Güne Özel",
    "summary.emptyDays": "boş gün",
    "feedback.title": "Geri bildirim",
    "feedback.empty": "Henüz yorum yok.",
    "lang.toggle": "Dili değiştir",
    "theme.toggle": "Temayı değiştir",
  },
  en: {
    "nav.brands": "Brands",
    "nav.queue": "Approvals",
    "nav.guide": "Guide",
    "nav.developer": "Developer",
    "action.save": "Save",
    "action.cancel": "Cancel",
    "action.edit": "Edit",
    "action.delete": "Delete",
    "action.approve": "Approve",
    "action.revise": "Request changes",
    "action.generate": "Generate calendar",
    "action.regenerate": "Regenerate",
    "action.sendInternal": "Send for internal review",
    "view.calendar": "Calendar",
    "view.list": "List",
    "type.post": "Post",
    "type.story": "Story",
    "type.reel": "Reels",
    "type.special": "Special day",
    "summary.emptyDays": "empty days",
    "feedback.title": "Feedback",
    "feedback.empty": "No comments yet.",
    "lang.toggle": "Change language",
    "theme.toggle": "Change theme",
  },
} as const;

export type TranslationKey = keyof (typeof DICT)["tr"];

export function translate(lang: Language, key: TranslationKey): string {
  return DICT[lang]?.[key] ?? DICT.tr[key] ?? key;
}
