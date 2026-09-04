/**
 * Google's lh3/drive.google.com URLs are undocumented and inconsistent for
 * third-party server-side fetchers — OpenAI/Anthropic vision often can't
 * download them in time ("Unable to download content from the provided URL").
 * Filter them out rather than let one flaky image break a whole AI call.
 */
const UNRELIABLE_HOST = /googleusercontent\.com|drive\.google\.com/;

export function visionSafeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!/^https:\/\//.test(url)) return null;
  if (UNRELIABLE_HOST.test(url)) return null;
  return url;
}
