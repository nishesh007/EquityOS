import type { MarketNews } from "@/types";
import {
  decodeHtmlEntities,
  sanitizeNewsText,
  stripDuplicatedPublisher,
} from "@/lib/news/sanitizeNewsText";

const SUPPORTED_SOURCES = new Map<string, string>([
  ["reuters", "Reuters"],
  ["bloomberg", "Bloomberg"],
  ["economic times", "Economic Times"],
  ["the economic times", "Economic Times"],
  ["moneycontrol", "Moneycontrol"],
  ["business standard", "Business Standard"],
  ["mint", "Mint"],
  ["livemint", "Mint"],
]);

const NEWS_FEED_URL =
  "https://news.google.com/rss/search?q=India%20(stock%20market%20OR%20economy%20OR%20RBI%20OR%20SEBI)%20when%3A1d&hl=en-IN&gl=IN&ceid=IN%3Aen";

function element(xml: string, name: string): string {
  const match = xml.match(
    new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i")
  );
  return match ? decodeHtmlEntities(match[1]) : "";
}

function categoryFor(title: string): MarketNews["category"] {
  const text = title.toLowerCase();
  if (/\b(rbi|sebi|government|policy|regulation|tax|budget)\b/.test(text)) {
    return "Policy";
  }
  if (/\b(gdp|inflation|economy|rate|rupee|employment)\b/.test(text)) {
    return "Economy";
  }
  if (/\b(global|china|us |u\.s\.|europe|asia|oil|fed)\b/.test(text)) {
    return "Global";
  }
  if (/\b(results|earnings|profit|revenue|company|deal|acquisition)\b/.test(text)) {
    return "Corporate";
  }
  return "Market";
}

function sentimentFor(title: string): MarketNews["sentiment"] {
  const text = title.toLowerCase();
  if (/\b(rise|rally|gain|surge|record|growth|beat|profit|strong)\w*\b/.test(text)) {
    return "Positive";
  }
  if (/\b(fall|drop|slump|loss|weak|decline|risk|miss|cut)\w*\b/.test(text)) {
    return "Negative";
  }
  return "Neutral";
}

function relativeTime(publishedAt: string): string {
  const deltaMinutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(publishedAt).getTime()) / 60_000)
  );
  if (deltaMinutes < 60) return `${deltaMinutes} min ago`;
  const hours = Math.floor(deltaMinutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function parseVerifiedNewsFeed(xml: string): MarketNews[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
  const seen = new Set<string>();

  return items
    .map((item): MarketNews | null => {
      const rawTitle = element(item, "title");
      const rawSource = element(item, "source");
      const source = supportedSource(rawSource);
      const url = element(item, "link");
      const publishedAt = element(item, "pubDate");
      if (!source || !rawTitle || !url || !publishedAt) return null;

      const title = stripDuplicatedPublisher(
        sanitizeNewsText(rawTitle),
        source,
        rawSource
      );
      if (!title || seen.has(title.toLowerCase())) return null;
      seen.add(title.toLowerCase());

      const description = stripDuplicatedPublisher(
        sanitizeNewsText(element(item, "description")),
        source,
        rawSource
      );

      return {
        id: `${source}-${publishedAt}-${title}`
          .toLowerCase()
          .replace(/\W+/g, "-"),
        title,
        source,
        timestamp: relativeTime(publishedAt),
        publishedAt: new Date(publishedAt).toISOString(),
        category: categoryFor(title),
        sentiment: sentimentFor(title),
        summary: description || `${source} market coverage.`,
        url,
      };
    })
    .filter((item): item is MarketNews => item !== null)
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
    .slice(0, 8);
}

function supportedSource(rawSource: string): string | null {
  return SUPPORTED_SOURCES.get(rawSource.trim().toLowerCase()) ?? null;
}

export async function fetchVerifiedMarketNews(): Promise<MarketNews[]> {
  try {
    const response = await fetch(NEWS_FEED_URL, {
      headers: {
        "User-Agent": "EquityOS/1.0",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
      next: { revalidate: 300 },
    });
    if (!response.ok) return [];
    return parseVerifiedNewsFeed(await response.text());
  } catch {
    return [];
  }
}
