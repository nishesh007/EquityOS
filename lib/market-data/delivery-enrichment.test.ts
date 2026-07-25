import { describe, expect, it } from "vitest";
import { parseDeliveryPercent } from "./delivery-enrichment";

describe("parseDeliveryPercent", () => {
  it("accepts numeric and percent-string values", () => {
    expect(parseDeliveryPercent(78.4)).toBe(78.4);
    expect(parseDeliveryPercent("65.2%")).toBe(65.2);
    expect(parseDeliveryPercent("91.8")).toBe(91.8);
  });

  it("rejects invalid values", () => {
    expect(parseDeliveryPercent(null)).toBeNull();
    expect(parseDeliveryPercent(undefined)).toBeNull();
    expect(parseDeliveryPercent(120)).toBeNull();
    expect(parseDeliveryPercent("n/a")).toBeNull();
  });
});
