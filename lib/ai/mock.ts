import type { AIClient, CaptionRequest, CaptionResult } from "./types";

const POST_LINES = [
  "Bugün tezgâhta taze ve sıcak 🥐",
  "Gününüze küçük bir mola: bir kahve, bir tatlı ☕️",
  "Elimizden çıkan her şey sabah taze hazırlandı",
  "Hafta içi enerjisi için doğru adres burası",
  "Sizin için özenle hazırladık — beğeneceksiniz",
  "Yeni lezzet raflarda, kaçırmayın",
  "Klasikleri sevenler buraya ✨",
  "Bu kareyi görünce canınız çekecek",
];

const REEL_LINES = [
  "60 saniyede mutfaktan kısa bir kesit 🎥",
  "Kamera arkası: her şey nasıl hazırlanıyor?",
  "Sesi açın, detaylar kıymetli 🔊",
  "Gün içinden hızlı bir tur",
];

function trDate(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

function slug(s: string): string {
  return s
    .toLocaleLowerCase("tr")
    .replace(/[çğıöşü]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[c] ?? c)
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);
}

/** Deterministic offline caption generator used in Phase 1 (no API calls). */
export class MockAI implements AIClient {
  async captions(req: CaptionRequest): Promise<CaptionResult> {
    const tag = slug(req.brandName) || "marka";
    const captions = req.items.map((item) => {
      const day = Number(item.date.slice(8, 10));
      if (item.type === "story") return null;
      if (item.type === "special") {
        const label = item.specialLabel ?? "Özel gün";
        return `${label} 🎉 ${req.brandName} olarak bugüne özel bir sürprizimiz var. #${tag} #${slug(label)}`;
      }
      if (item.type === "reel") {
        return `${REEL_LINES[day % REEL_LINES.length]} #reels #${tag}`;
      }
      return `${req.brandName} · ${trDate(item.date)} — ${POST_LINES[day % POST_LINES.length]} #${tag}`;
    });
    return { captions };
  }
}
