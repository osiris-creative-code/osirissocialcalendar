import Anthropic from "@anthropic-ai/sdk";
import { captionLanguageRule } from "@/lib/caption-language";
import { fetchImageBytes, fetchImageBytesMany } from "@/lib/ai/fetch-image";
import type {
  AIClient,
  AnalyzeFeedRequest,
  AnalyzeFeedResult,
  CaptionRequest,
  CaptionResult,
  RewriteRequest,
  SuggestPlanRequest,
  SuggestPlanResult,
  GroupSimilarRequest,
  GroupSimilarResult,
  ReviewCalendarRequest,
  ReviewCalendarResult,
  ReviewNote,
} from "./types";

const MODEL = process.env.OSIRIS_AI_MODEL ?? "claude-sonnet-5";

function isRemote(url?: string | null): url is string {
  return !!url && /^https?:\/\//.test(url);
}

function imageBlockFromBytes(img: { mediaType: string; base64: string }): Anthropic.ImageBlockParam {
  return {
    type: "image",
    source: { type: "base64", media_type: img.mediaType as "image/png" | "image/jpeg" | "image/webp" | "image/gif", data: img.base64 },
  };
}

/** Pull the first JSON value out of a model response that may wrap it in prose/fences. */
function extractJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.search(/[[{]/);
  if (start === -1) throw new Error("model did not return JSON");
  return JSON.parse(body.slice(start)) as T;
}

/** Real Claude-backed implementation. Selected when ANTHROPIC_API_KEY is set. */
export class AnthropicAI implements AIClient {
  private client = new Anthropic();

  async captions(req: CaptionRequest): Promise<CaptionResult> {
    const needsCaption = req.items
      .map((it, index) => ({ ...it, index }))
      .filter((it) => it.type !== "story");

    const lines = needsCaption
      .map(
        (it) =>
          `#${it.index} · ${it.date} · ${it.type}${it.specialLabel ? ` · ${it.specialLabel}` : ""}`,
      )
      .join("\n");

    const insights = req.feedInsights?.length
      ? `\n\nMarkanın mevcut feed'i hakkında notlar (yeni içerik buna uyumlu olsun):\n- ${req.feedInsights.join("\n- ")}`
      : "";

    const content: Anthropic.ContentBlockParam[] = [
      {
        type: "text",
        text:
          `${req.brandName} markası için sosyal medya açıklamaları (caption) yaz. ` +
          `Ton: ${req.tone}. ${captionLanguageRule(req.language ?? "tr")} 1–3 cümle, sona 1–3 hashtag. Story öğeleri listede yok.` +
          insights +
          `\n\nÖğeler:\n${lines}` +
          `\n\nSadece şu JSON'u döndür: {"captions":[{"index":<sayı>,"caption":"<metin>"}]}`,
      },
    ];

    if (req.vision) {
      const withImages = needsCaption.filter((it) => isRemote(it.imageUrl));
      const fetched = await fetchImageBytesMany(withImages.map((it) => it.imageUrl!));
      const byUrl = new Map(fetched.map((f) => [f.url, f.image]));
      for (const it of withImages) {
        const img = byUrl.get(it.imageUrl!);
        if (img) content.push({ type: "text", text: `#${it.index} görseli:` }, imageBlockFromBytes(img));
      }
    }

    const res = await this.client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      messages: [{ role: "user", content }],
    });
    const text = res.content.find((b) => b.type === "text")?.text ?? "";
    const parsed = extractJson<{ captions: { index: number; caption: string }[] }>(text);
    const byIndex = new Map(parsed.captions.map((c) => [c.index, c.caption]));
    return { captions: req.items.map((it, i) => (it.type === "story" ? null : byIndex.get(i) ?? null)) };
  }

  async rewriteCaption(req: RewriteRequest): Promise<{ caption: string }> {
    const insights = req.feedInsights?.length
      ? `\nFeed notları: ${req.feedInsights.join("; ")}`
      : "";
    const content: Anthropic.ContentBlockParam[] = [
      {
        type: "text",
        text:
          `${req.brandName} (${req.type}) için bu açıklamayı yeniden yaz. Ton: ${req.tone}. ` +
          `${captionLanguageRule(req.language ?? "tr")} 1–3 cümle, 1–3 hashtag.` +
          (req.instruction ? ` Yönerge: ${req.instruction}.` : "") +
          insights +
          `\n\nMevcut: ${req.current}\n\nSadece yeni açıklamayı düz metin olarak döndür.`,
      },
    ];
    if (req.vision && isRemote(req.imageUrl)) {
      const img = await fetchImageBytes(req.imageUrl);
      if (img) content.push(imageBlockFromBytes(img));
    }

    const res = await this.client.messages.create({
      model: MODEL,
      max_tokens: 400,
      messages: [{ role: "user", content }],
    });
    const text = res.content.find((b) => b.type === "text")?.text?.trim() ?? req.current;
    return { caption: text };
  }

  async analyzeFeed(req: AnalyzeFeedRequest): Promise<AnalyzeFeedResult> {
    const content: Anthropic.ContentBlockParam[] = [
      {
        type: "text",
        text:
          `${req.brandName} (@${req.handle ?? "?"}) markasının mevcut Instagram feed'inden birkaç kare aşağıda. ` +
          `Renk paleti, ton, tekrar eden temalar ve eksik kalan içerik türleri hakkında 3–6 kısa Türkçe madde çıkar.` +
          `\n\nSadece şu JSON'u döndür: {"insights":["<madde>", ...]}`,
      },
    ];
    const feedImages = await fetchImageBytesMany(req.imageUrls.filter(isRemote).slice(0, 9));
    for (const f of feedImages) content.push(imageBlockFromBytes(f.image));

    const res = await this.client.messages.create({
      model: MODEL,
      max_tokens: 600,
      messages: [{ role: "user", content }],
    });
    const text = res.content.find((b) => b.type === "text")?.text ?? "";
    const parsed = extractJson<{ insights: string[] }>(text);
    return { insights: parsed.insights.slice(0, 6) };
  }

  async suggestPlan(req: SuggestPlanRequest): Promise<SuggestPlanResult> {
    const { post, story, reel } = req.counts;
    const content: Anthropic.ContentBlockParam[] = [
      {
        type: "text",
        text:
          `${req.brandName} markası için ${req.rangeStart} – ${req.rangeEnd} arası bir sosyal medya ` +
          `paylaşım planı önerisi hazırla. Elde bu içerik var: ${post} post, ${story} story, ${reel} reels. ` +
          `${req.contentRules?.trim() ? `Markanın sabit kuralları (bunlar önceliklidir): ${req.contentRules.trim()}. ` : ""}` +
          `Hesaplanan tempo: "${req.cadenceBrief}". Kural yoksa bu tempoyu koru; sadece Türkçe ton cümlesi ekle ` +
          `(ör. "postlarda sıcak, samimi bir dil ve hafif emoji; story'lere açıklama yazma"). ` +
          `Aşağıdaki görsellerde tarihli bir kampanya / özel gün grafiği görürsen ve tarih ` +
          `${req.rangeStart}–${req.rangeEnd} aralığındaysa "<gün> <ay>'e özel post" cümlesini ekle; yoksa ekleme.` +
          `\n\nSadece şu JSON'u döndür: {"prompt":"<tam Türkçe brief tek paragraf>","note":"<tek cümle: ne bulundu>"}`,
      },
    ];
    const suggestImages = await fetchImageBytesMany(req.imageUrls.filter(isRemote).slice(0, 8));
    for (const f of suggestImages) content.push(imageBlockFromBytes(f.image));

    const res = await this.client.messages.create({
      model: MODEL,
      max_tokens: 500,
      messages: [{ role: "user", content }],
    });
    const text = res.content.find((b) => b.type === "text")?.text ?? "";
    try {
      const parsed = extractJson<{ prompt?: string; note?: string }>(text);
      return {
        prompt:
          parsed.prompt?.trim() ||
          `${req.rangeStart} – ${req.rangeEnd} arası: ${req.cadenceBrief}. Postlarda sıcak, samimi bir dil, hafif emoji. Story'lere açıklama yazma.`,
        note: parsed.note?.trim() || `${post} post, ${story} story, ${reel} reels bulundu.`,
      };
    } catch {
      return {
        prompt: `${req.rangeStart} – ${req.rangeEnd} arası: ${req.cadenceBrief}. Postlarda sıcak, samimi bir dil, hafif emoji. Story'lere açıklama yazma.`,
        note: `${post} post, ${story} story, ${reel} reels bulundu.`,
      };
    }
  }

  async groupSimilar(req: GroupSimilarRequest): Promise<GroupSimilarResult> {
    const content: Anthropic.ContentBlockParam[] = [
      {
        type: "text",
        text:
          `${req.brandName} markasının çekiminden birkaç görsel grubu aşağıda. Her grup için ` +
          `görsellere bakıp karar ver:\n` +
          `- "carousel": aynı anın/çekimin kareleri, tek bir kaydırmalı gönderi olmalı.\n` +
          `- "spread": benzer ama ayrı gönderi olmalı; takvimde birbirinden uzak günlere konsun.\n` +
          `- "unrelated": aslında benzemiyorlar, öneri gösterme.\n\n` +
          `Sadece şu JSON'u döndür: ` +
          `{"verdicts":[{"candidateId":"<id>","verdict":"carousel|spread|unrelated","reason":"<tek kısa Türkçe cümle>"}]}`,
      },
    ];
    for (const c of req.candidates) {
      content.push({ type: "text", text: `Grup ${c.id} (${c.type}) — ${c.names.join(", ")}:` });
      const groupImages = await fetchImageBytesMany(c.imageUrls.filter(isRemote));
      for (const f of groupImages) content.push(imageBlockFromBytes(f.image));
    }

    const res = await this.client.messages.create({
      model: MODEL,
      max_tokens: 700,
      messages: [{ role: "user", content }],
    });
    const text = res.content.find((b) => b.type === "text")?.text ?? "";
    const parsed = extractJson<GroupSimilarResult>(text);
    return { verdicts: parsed.verdicts ?? [] };
  }

  async reviewCalendar(req: ReviewCalendarRequest): Promise<ReviewCalendarResult> {
    const lines = req.items
      .map((i) => `${i.date} · ${i.type}${i.caption ? ` · ${i.caption}` : ""}`)
      .join("\n");
    const res = await this.client.messages.create({
      model: MODEL,
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content:
            `${req.brandName} için ${req.rangeStart} – ${req.rangeEnd} arası üretilmiş takvim aşağıda. ` +
            `Sunucuda hesaplanmış tespitler de veriliyor — sayıları yeniden hesaplama, sadece ` +
            `hangileri gerçekten önemli onu seç, önceliklendir ve ekibin anlayacağı dille yaz. ` +
            `En fazla 5 not döndür; her şey yolundaysa boş liste döndür.\n\n` +
            `Hesaplanan tespitler:\n- ${req.facts.join("\n- ")}\n\nTakvim:\n${lines}\n\n` +
            `Sadece şu JSON'u döndür: {"notes":[{"kind":"similar-too-close|balance|caption-repeat|special-day",` +
            `"severity":"info|warn","message":"<tek kısa Türkçe cümle>"}]}`,
        },
      ],
    });
    const text = res.content.find((b) => b.type === "text")?.text ?? "";
    try {
      const parsed = extractJson<{ notes?: ReviewNote[] }>(text);
      return { notes: (parsed.notes ?? []).slice(0, 5) };
    } catch {
      return { notes: [] };
    }
  }
}
