import OpenAI from "openai";
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

const MODEL = process.env.OSIRIS_AI_MODEL ?? "gpt-4o-mini";

function isRemote(url?: string | null): url is string {
  return !!url && /^https?:\/\//.test(url);
}

type Part = OpenAI.Chat.Completions.ChatCompletionContentPart;
/** OpenAI accepts a data: URL in the same image_url shape — no separate fetch on their end. */
const imgFromBytes = (i: { mediaType: string; base64: string }): Part => ({
  type: "image_url",
  image_url: { url: `data:${i.mediaType};base64,${i.base64}` },
});
const txt = (text: string): Part => ({ type: "text", text });

/** OpenAI-backed implementation. Selected when OPENAI_API_KEY is set. */
export class OpenAIAI implements AIClient {
  private client = new OpenAI();

  private async chat(
    content: Part[],
    opts: { json?: boolean; maxTokens: number },
  ): Promise<string> {
    const res = await this.client.chat.completions.create({
      model: MODEL,
      max_completion_tokens: opts.maxTokens,
      ...(opts.json ? { response_format: { type: "json_object" as const } } : {}),
      messages: [{ role: "user", content }],
    });
    return res.choices[0]?.message?.content ?? "";
  }

  async captions(req: CaptionRequest): Promise<CaptionResult> {
    const needsCaption = req.items
      .map((it, index) => ({ ...it, index }))
      .filter((it) => it.type !== "story");

    const lines = needsCaption
      .map((it) => `#${it.index} · ${it.date} · ${it.type}${it.specialLabel ? ` · ${it.specialLabel}` : ""}`)
      .join("\n");
    const insights = req.feedInsights?.length
      ? `\n\nMarkanın mevcut feed'i hakkında notlar (yeni içerik buna uyumlu olsun):\n- ${req.feedInsights.join("\n- ")}`
      : "";

    const content: Part[] = [
      txt(
        `${req.brandName} markası için sosyal medya açıklamaları (caption) yaz. ` +
          `Ton: ${req.tone}. ${captionLanguageRule(req.language ?? "tr")} 1–3 cümle, sona 1–3 hashtag. Story öğeleri listede yok.` +
          insights +
          `\n\nÖğeler:\n${lines}` +
          `\n\nSadece şu JSON'u döndür: {"captions":[{"index":<sayı>,"caption":"<metin>"}]}`,
      ),
    ];
    if (req.vision) {
      const withImages = needsCaption.filter((it) => isRemote(it.imageUrl));
      const fetched = await fetchImageBytesMany(withImages.map((it) => it.imageUrl!));
      const byUrl = new Map(fetched.map((f) => [f.url, f.image]));
      for (const it of withImages) {
        const image = byUrl.get(it.imageUrl!);
        if (image) content.push(txt(`#${it.index} görseli:`), imgFromBytes(image));
      }
    }

    const raw = await this.chat(content, { json: true, maxTokens: 2000 });
    const parsed = JSON.parse(raw || "{}") as { captions?: { index: number; caption: string }[] };
    const byIndex = new Map((parsed.captions ?? []).map((c) => [c.index, c.caption]));
    return { captions: req.items.map((it, i) => (it.type === "story" ? null : byIndex.get(i) ?? null)) };
  }

  async rewriteCaption(req: RewriteRequest): Promise<{ caption: string }> {
    const insights = req.feedInsights?.length ? `\nFeed notları: ${req.feedInsights.join("; ")}` : "";
    const content: Part[] = [
      txt(
        `${req.brandName} (${req.type}) için bu açıklamayı yeniden yaz. Ton: ${req.tone}. ` +
          `${captionLanguageRule(req.language ?? "tr")} 1–3 cümle, 1–3 hashtag.` +
          (req.instruction ? ` Yönerge: ${req.instruction}.` : "") +
          insights +
          `\n\nMevcut: ${req.current}\n\nSadece yeni açıklamayı düz metin olarak döndür.`,
      ),
    ];
    if (req.vision && isRemote(req.imageUrl)) {
      const image = await fetchImageBytes(req.imageUrl);
      if (image) content.push(imgFromBytes(image));
    }
    const raw = await this.chat(content, { maxTokens: 400 });
    return { caption: raw.trim() || req.current };
  }

  async analyzeFeed(req: AnalyzeFeedRequest): Promise<AnalyzeFeedResult> {
    const content: Part[] = [
      txt(
        `${req.brandName} (@${req.handle ?? "?"}) markasının mevcut Instagram feed'inden birkaç kare aşağıda. ` +
          `Renk paleti, ton, tekrar eden temalar ve eksik kalan içerik türleri hakkında 3–6 kısa Türkçe madde çıkar.` +
          `\n\nSadece şu JSON'u döndür: {"insights":["<madde>", ...]}`,
      ),
    ];
    const feedImages = await fetchImageBytesMany(req.imageUrls.filter(isRemote).slice(0, 9));
    for (const f of feedImages) content.push(imgFromBytes(f.image));
    const raw = await this.chat(content, { json: true, maxTokens: 600 });
    const parsed = JSON.parse(raw || "{}") as { insights?: string[] };
    return { insights: (parsed.insights ?? []).slice(0, 6) };
  }

  async suggestPlan(req: SuggestPlanRequest): Promise<SuggestPlanResult> {
    const { post, story, reel } = req.counts;
    const content: Part[] = [
      txt(
        `${req.brandName} markası için ${req.rangeStart} – ${req.rangeEnd} arası bir sosyal medya ` +
          `paylaşım planı önerisi hazırla. Elde bu içerik var: ${post} post, ${story} story, ${reel} reels. ` +
          `${req.contentRules?.trim() ? `Markanın sabit kuralları (bunlar önceliklidir): ${req.contentRules.trim()}. ` : ""}` +
          `Hesaplanan tempo: "${req.cadenceBrief}". Kural yoksa bu tempoyu koru; sadece Türkçe ton cümlesi ekle ` +
          `(ör. "postlarda sıcak, samimi bir dil ve hafif emoji; story'lere açıklama yazma"). ` +
          `Aşağıdaki görsellerde tarihli bir kampanya / özel gün grafiği görürsen ve tarih ` +
          `${req.rangeStart}–${req.rangeEnd} aralığındaysa "<gün> <ay>'e özel post" cümlesini ekle; yoksa ekleme. ` +
          `\n\nSadece şu JSON'u döndür: {"prompt":"<tam Türkçe brief tek paragraf>","note":"<tek cümle: ne bulundu>"}`,
      ),
    ];
    const suggestImages = await fetchImageBytesMany(req.imageUrls.filter(isRemote).slice(0, 8));
    for (const f of suggestImages) content.push(imgFromBytes(f.image));
    const raw = await this.chat(content, { json: true, maxTokens: 500 });
    const parsed = JSON.parse(raw || "{}") as { prompt?: string; note?: string };
    return {
      prompt:
        parsed.prompt?.trim() ||
        `${req.rangeStart} – ${req.rangeEnd} arası: ${req.cadenceBrief}. Postlarda sıcak, samimi bir dil, hafif emoji. Story'lere açıklama yazma.`,
      note: parsed.note?.trim() || `${post} post, ${story} story, ${reel} reels bulundu.`,
    };
  }

  async groupSimilar(req: GroupSimilarRequest): Promise<GroupSimilarResult> {
    const content: Part[] = [
      txt(
        `${req.brandName} markasının çekiminden birkaç görsel grubu aşağıda. Her grup için ` +
          `görsellere bakıp karar ver:\n` +
          `- "carousel": aynı anın/çekimin kareleri, tek bir kaydırmalı gönderi olmalı. SADECE "post" tipi bir grup için öner — Instagram'da story ve reels kaydırmalı olamaz.\n` +
          `- "spread": benzer ama ayrı gönderi olmalı; takvimde birbirinden uzak günlere konsun.\n` +
          `- "unrelated": aslında benzemiyorlar, öneri gösterme.\n\n` +
          `Sadece şu JSON'u döndür: ` +
          `{"verdicts":[{"candidateId":"<id>","verdict":"carousel|spread|unrelated","reason":"<tek kısa Türkçe cümle>"}]}`,
      ),
    ];
    for (const c of req.candidates) {
      content.push(txt(`Grup ${c.id} (${c.type}) — ${c.names.join(", ")}:`));
      const groupImages = await fetchImageBytesMany(c.imageUrls.filter(isRemote));
      for (const f of groupImages) content.push(imgFromBytes(f.image));
    }
    const raw = await this.chat(content, { json: true, maxTokens: 700 });
    const parsed = JSON.parse(raw || "{}") as GroupSimilarResult;
    return { verdicts: parsed.verdicts ?? [] };
  }

  async reviewCalendar(req: ReviewCalendarRequest): Promise<ReviewCalendarResult> {
    const lines = req.items
      .map((i) => `${i.date} · ${i.type}${i.caption ? ` · ${i.caption}` : ""}`)
      .join("\n");
    const raw = await this.chat(
      [
        txt(
          `${req.brandName} için ${req.rangeStart} – ${req.rangeEnd} arası üretilmiş takvim aşağıda. ` +
            `Sunucuda hesaplanmış tespitler de veriliyor — sayıları yeniden hesaplama, sadece ` +
            `hangileri gerçekten önemli onu seç, önceliklendir ve ekibin anlayacağı dille yaz. ` +
            `En fazla 5 not döndür; her şey yolundaysa boş liste döndür.\n\n` +
            `Hesaplanan tespitler:\n- ${req.facts.join("\n- ")}\n\nTakvim:\n${lines}\n\n` +
            `Sadece şu JSON'u döndür: {"notes":[{"kind":"similar-too-close|balance|caption-repeat|special-day",` +
            `"severity":"info|warn","message":"<tek kısa Türkçe cümle>"}]}`,
        ),
      ],
      { json: true, maxTokens: 800 },
    );
    const parsed = JSON.parse(raw || "{}") as { notes?: ReviewNote[] };
    return { notes: (parsed.notes ?? []).slice(0, 5) };
  }
}
