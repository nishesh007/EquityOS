import { describe, expect, it } from "vitest";
import { parseVerifiedNewsFeed } from "@/services/verifiedMarketNews";

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
    <title><![CDATA[Sensex sinks&nbsp;over 2,000 points - The Economic Times]]></title>
    <link>https://news.google.com/articles/et-sensex</link>
    <pubDate>Sat, 18 Jul 2026 09:00:00 GMT</pubDate>
    <description><![CDATA[The Economic Times Sensex sinks&nbsp;over 2,000 points]]></description>
    <source url="https://economictimes.indiatimes.com">The Economic Times</source>
  </item>
</channel></rss>`;

describe("verified news feed sanitization", () => {
  it("decodes HTML entities in title and summary", () => {
    const result = parseVerifiedNewsFeed(feed);
    const reuters = result.find((item) => item.source === "Reuters");
    expect(reuters?.title).toBe("Indian shares rally on bank gains");
    expect(reuters?.summary).toContain("Benchmarks rose & held");
    expect(reuters?.summary).not.toMatch(/&nbsp;|&amp;/);
  });

  it("strips duplicated publisher names", () => {
    const result = parseVerifiedNewsFeed(feed);
    const et = result.find((item) => item.source === "Economic Times");
    expect(et?.title).toBe("Sensex sinks over 2,000 points");
    expect(et?.summary).toBe("Sensex sinks over 2,000 points");
  });
});
