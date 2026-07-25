/**
 * News text sanitization — decode HTML entities and strip publisher duplication.
 * Presentation hygiene only; does not change feed selection rules.
 */

/** Decode common HTML / XML entities (named + numeric) into readable text. */
export function decodeHtmlEntities(value: string): string {
  if (!value) return "";

  let text = value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");

  for (let pass = 0; pass < 3; pass += 1) {
    text = text
      .replace(/&amp;/gi, "&")
      .replace(/&nbsp;/gi, " ")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&mdash;/gi, "—")
      .replace(/&ndash;/gi, "–")
      .replace(/&hellip;/gi, "…")
      .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => {
        const code = Number.parseInt(hex, 16);
        return Number.isFinite(code) ? String.fromCodePoint(code) : "";
      })
      .replace(/&#(\d+);/g, (_, dec: string) => {
        const code = Number.parseInt(dec, 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : "";
      });
  }

  return text.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

/** Strip HTML tags then decode entities. */
export function sanitizeNewsText(value: string): string {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, " "));
}

/**
 * Remove duplicated publisher labels that RSS parsers often leave in
 * titles ("… - Reuters") or summaries ("Economic Times Sensex…").
 */
export function stripDuplicatedPublisher(
  text: string,
  source: string,
  rawSource?: string
): string {
  let cleaned = text;
  const labels = [source, rawSource]
    .filter((label): label is string => Boolean(label && label.trim()))
    .flatMap((label) => {
      const trimmed = label.trim();
      return [trimmed, `The ${trimmed}`, trimmed.replace(/^The\s+/i, "")];
    });

  const unique = [...new Set(labels.map((l) => l.trim()).filter(Boolean))];

  for (const label of unique) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    cleaned = cleaned
      .replace(new RegExp(`\\s*[-–—|]\\s*${escaped}\\s*$`, "i"), "")
      .replace(new RegExp(`^${escaped}\\s*[-–—|:]\\s*`, "i"), "")
      .replace(new RegExp(`^${escaped}\\s+`, "i"), "");
  }

  return cleaned.replace(/\s+/g, " ").trim();
}
