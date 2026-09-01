const NOT_WEB_PLAYABLE = /\.(mov|avi|mkv|wmv|flv)$|quicktime|x-msvideo|x-matroska|x-ms-wmv/i;

/** Best-effort guess: can a browser <video> almost certainly play this file/MIME? */
export function isWebPlayableVideo(nameOrType: string): boolean {
  return !NOT_WEB_PLAYABLE.test(nameOrType.trim());
}
