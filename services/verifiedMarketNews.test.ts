import { describe, expect, it } from "vitest";
import { parseVerifiedNewsFeed } from "./verifiedMarketNews";

const feed = `<?xml version="1.0"?>
<rss><channel>
  <item>
    <title><![CDATA[Indian shares rally on bank gains - Reuters]]></title>
    <link>https://news.google.com/articles/reuters-market</link>
    <pubDate>Sat, 18 Jul 2026 08:00:00 GMT</pubDate>
    <description><![CDATA[<p>Benchmarks&nbsp;rose &amp; held in afternoon trade.</p>]]></description>
    <source url="https://reuters.com">Reuters</source>
  </item>
  <item>
    <title>Unverified market rumour - Example Blog</title>
    <link>https://example.com/rumour</link>
    <pubDate>Sat, 18 Jul 2026 07:00:00 GMT</pubDate>
    <source url="https://example.com">Example Blog</source>
  </item>
  <item>
    <title><![CDATA[Sensex sinks&nbsp;over 2,000 points - The Economic Times]]></title>
    <link>https://news.google.com/articles/et-sensex</link>
    <pubDate>Sat, 18 Jul 2026 09:00:00 GMT</pubDate>
    <description><![CDATA[The Economic Times Sensex sinks&nbsp;over 2,000 points]]></description>
    <source url="https://economictimes.indiatimes.com">The Economic Times</source>
  </item>
</channel></rss>`;

describe("parseVerifiedNewsFeed", () => {
  it("keeps approved publishers and emits clickable news metadata", () => {
    const result = parseVerifiedNewsFeed(feed);
    expect(result.length).toBeGreaterThanOrEqual(1);
    const reuters = result.find((item) => item.source === "Reuters");
    expect(reuters).toMatchObject({
      title: "Indian shares rally on bank gains",
      source: "Reuters",
      category: "Market",
      sentiment: "Positive",
      url: "https://news.google.com/articles/reuters-market",
    });
    expect(reuters?.summary).toContain("Benchmarks rose & held");
    expect(reuters?.summary).not.toMatch(/&nbsp;|&amp;/);
  });

  it("strips HTML entities and duplicated publisher names", () => {
    const result = parseVerifiedNewsFeed(feed);
    const et = result.find((item) => item.source === "Economic Times");
    expect(et?.title).toBe("Sensex sinks over 2,000 points");
    expect(et?.summary).toBe("Sensex sinks over 2,000 points");
    expect(et?.title).not.toMatch(/&nbsp;/);
  });
});
