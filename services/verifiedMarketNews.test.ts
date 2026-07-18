import { describe, expect, it } from "vitest";
import { parseVerifiedNewsFeed } from "./verifiedMarketNews";

const feed = `<?xml version="1.0"?>
<rss><channel>
  <item>
    <title><![CDATA[Indian shares rally on bank gains - Reuters]]></title>
    <link>https://news.google.com/articles/reuters-market</link>
    <pubDate>Sat, 18 Jul 2026 08:00:00 GMT</pubDate>
    <description><![CDATA[<p>Benchmarks rose in afternoon trade.</p>]]></description>
    <source url="https://reuters.com">Reuters</source>
  </item>
  <item>
    <title>Unverified market rumour - Example Blog</title>
    <link>https://example.com/rumour</link>
    <pubDate>Sat, 18 Jul 2026 07:00:00 GMT</pubDate>
    <source url="https://example.com">Example Blog</source>
  </item>
</channel></rss>`;

describe("parseVerifiedNewsFeed", () => {
  it("keeps approved publishers and emits clickable news metadata", () => {
    const result = parseVerifiedNewsFeed(feed);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: "Indian shares rally on bank gains",
      source: "Reuters",
      category: "Market",
      sentiment: "Positive",
      url: "https://news.google.com/articles/reuters-market",
    });
    expect(result[0].publishedAt).toBeTruthy();
  });
});
