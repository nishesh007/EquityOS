import { describe, expect, it } from "vitest";
import {
  decodeHtmlEntities,
  sanitizeNewsText,
  stripDuplicatedPublisher,
} from "./sanitizeNewsText";

describe("sanitizeNewsText", () => {
  it("decodes common HTML entities including nbsp", () => {
    expect(decodeHtmlEntities("Sensex&nbsp;sinks &amp; falls&#39;")).toBe(
      "Sensex sinks & falls'"
    );
    expect(decodeHtmlEntities("&quot;Rally&quot;")).toBe('"Rally"');
    expect(decodeHtmlEntities("A&#160;B")).toBe("A B");
  });

  it("strips tags then decodes", () => {
    expect(sanitizeNewsText("<p>Benchmarks&nbsp;rose &amp; held</p>")).toBe(
      "Benchmarks rose & held"
    );
  });

  it("removes duplicated publisher labels", () => {
    expect(
      stripDuplicatedPublisher(
        "Sensex sinks over 2,000 points - The Economic Times",
        "Economic Times",
        "The Economic Times"
      )
    ).toBe("Sensex sinks over 2,000 points");
    expect(
      stripDuplicatedPublisher(
        "Economic Times Sensex sinks over 2,000 points",
        "Economic Times"
      )
    ).toBe("Sensex sinks over 2,000 points");
  });
});
