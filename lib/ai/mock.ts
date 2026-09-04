import type {
  AIClient,
  AnalyzeFeedRequest,
  AnalyzeFeedResult,
  CaptionRequest,
  CaptionResult,
  GroupSimilarRequest,
  GroupSimilarResult,
  RewriteRequest,
  ReviewCalendarRequest,
  ReviewCalendarResult,
  ReviewNote,
  SuggestPlanRequest,
  SuggestPlanResult,
} from "./types";

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

/** Deterministic offline stand-in used when no ANTHROPIC_API_KEY is set. */
export class MockAI implements AIClient {
  async captions(req: CaptionRequest): Promise<CaptionResult> {
    const tag = slug(req.brandName) || "marka";
    const insightHint =
      req.feedInsights && req.feedInsights.length
        ? ` ${req.feedInsights[0].replace(/\.$/, "")}.`
        : "";
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
      return `${req.brandName} · ${trDate(item.date)} — ${POST_LINES[day % POST_LINES.length]}${insightHint} #${tag}`;
    });
    return { captions };
  }

  async rewriteCaption(req: RewriteRequest): Promise<{ caption: string }> {
    const tag = slug(req.brandName) || "marka";
    const steer = req.instruction?.trim();
    const base = req.current.replace(/\s*#\S+/g, "").trim();
    if (steer && /k[ıi]salt|k[ıi]sa/i.test(steer)) {
      return { caption: `${base.split("—").pop()?.trim() || base} #${tag}` };
    }
    if (steer && /e[ğg]lenceli|samimi|neşeli/i.test(steer)) {
      return { caption: `${base} 😄✨ Bugünü güzelleştirelim! #${tag}` };
    }
    return { caption: `${base} — yeni bir dokunuşla. #${tag}` };
  }

  async analyzeFeed(req: AnalyzeFeedRequest): Promise<AnalyzeFeedResult> {
    return {
      insights: [
        "Sıcak, toprak tonları ağırlıkta; parlak renkler az.",
        "Ürün yakın planları ve doğal ışık baskın.",
        "Metinler kısa ve samimi, bol emoji kullanılıyor.",
        "Video/reels oranı düşük — hareketli içerik artırılabilir.",
        `@${req.handle ?? req.brandName} için insan/behind-the-scenes kareleri eksik.`,
      ],
    };
  }

  async suggestPlan(req: SuggestPlanRequest): Promise<SuggestPlanResult> {
    const { post, story, reel } = req.counts;
    const total = post + story + reel;
    const rules = req.contentRules?.trim();
    if (rules) {
      return {
        prompt: `${req.rangeStart} – ${req.rangeEnd} arası: ${rules}. Postlarda sıcak ve samimi bir dil, hafif emoji. Story'lere açıklama yazma.`,
        note: `Marka kuralları uygulandı (${post} post, ${story} story, ${reel} reels elde).`,
      };
    }
    const prompt =
      total === 0
        ? `${req.brandName} için ${req.rangeStart} – ${req.rangeEnd} arası dengeli bir takvim: ` +
          `2 günde bir post, her gün story, haftada 1 reels. Postlarda sıcak ve samimi bir dil, ` +
          `hafif emoji. Story'lere açıklama yazma.`
        : `${req.rangeStart} – ${req.rangeEnd} arası: ${req.cadenceBrief}. ` +
          `Postlarda sıcak ve samimi bir dil, hafif emoji. Story'lere açıklama yazma.`;
    const note =
      total === 0
        ? "İçerik yok — genel bir şablon önerildi."
        : `${post} post, ${story} story, ${reel} reels bulundu; aralığa göre dağıtıldı.`;
    return { prompt, note };
  }

  /** Offline stand-in: posts shot back to back become a carousel, stories get spread. */
  async groupSimilar(req: GroupSimilarRequest): Promise<GroupSimilarResult> {
    return {
      verdicts: req.candidates.map((c) => ({
        candidateId: c.id,
        verdict: c.type === "post" ? ("carousel" as const) : ("spread" as const),
        reason:
          c.type === "post"
            ? `${c.assetIds.length} kare aynı seriden — tek kaydırmalı gönderi olabilir.`
            : `${c.assetIds.length} benzer kare — takvimde birbirinden uzak günlere konabilir.`,
      })),
    };
  }

  /** Offline stand-in: pass the computed facts through as plain notes. */
  async reviewCalendar(req: ReviewCalendarRequest): Promise<ReviewCalendarResult> {
    const kindOf = (fact: string): ReviewNote["kind"] => {
      if (/özel içerik yok/.test(fact)) return "special-day";
      if (/caption/i.test(fact)) return "caption-repeat";
      if (/gün arayla|benzeyen kare/.test(fact)) return "similar-too-close";
      return "balance";
    };
    const notes = req.facts
      .filter((f) => !f.startsWith("İçerik dağılımı:"))
      .slice(0, 5)
      .map((fact) => ({
        kind: kindOf(fact),
        severity: /boş|yok/.test(fact) ? ("warn" as const) : ("info" as const),
        message: fact,
      }));
    return { notes };
  }
}
