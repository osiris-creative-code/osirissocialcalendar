import OpenAI from "openai";
import type {
  AIClient,
  AnalyzeFeedRequest,
  AnalyzeFeedResult,
  CaptionRequest,
  CaptionResult,
  RewriteRequest,
} from "./types";

const MODEL = process.env.OSIRIS_AI_MODEL ?? "gpt-4o-mini";

function isRemote(url?: string | null): url is string {
  return !!url && /^https?:\/\//.test(url);
}

type Part = OpenAI.Chat.Completions.ChatCompletionContentPart;
const img = (url: string): Part => ({ type: "image_url", image_url: { url } });
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
          `Ton: ${req.tone}. Türkçe, 1–3 cümle, sona 1–3 hashtag. Story öğeleri listede yok.` +
          insights +
          `\n\nÖğeler:\n${lines}` +
          `\n\nSadece şu JSON'u döndür: {"captions":[{"index":<sayı>,"caption":"<metin>"}]}`,
      ),
    ];
    if (req.vision) {
      for (const it of needsCaption) {
        if (isRemote(it.imageUrl)) content.push(txt(`#${it.index} görseli:`), img(it.imageUrl));
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
          `Türkçe, 1–3 cümle, 1–3 hashtag.` +
          (req.instruction ? ` Yönerge: ${req.instruction}.` : "") +
          insights +
          `\n\nMevcut: ${req.current}\n\nSadece yeni açıklamayı düz metin olarak döndür.`,
      ),
    ];
    if (req.vision && isRemote(req.imageUrl)) content.push(img(req.imageUrl));
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
    for (const url of req.imageUrls.slice(0, 9)) if (isRemote(url)) content.push(img(url));
    const raw = await this.chat(content, { json: true, maxTokens: 600 });
    const parsed = JSON.parse(raw || "{}") as { insights?: string[] };
    return { insights: (parsed.insights ?? []).slice(0, 6) };
  }
}
