/**
 * Peter Lynch Business Quality Analyzer — Sprint 11B.3W.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { PeterLynchConfig } from "./PeterLynchConstants";
import type {
  PeterLynchBusinessAnalysis,
  PeterLynchBusinessInputs,
} from "./PeterLynchTypes";

export function analyzeBusinessQuality(
  business: PeterLynchBusinessInputs,
  config: PeterLynchConfig
): PeterLynchBusinessAnalysis {
  const reasons: string[] = [];
  const warnings: string[] = [];

  const scalableBusiness = clamp(business.scalableBusiness, 0, 100);
  const marketOpportunity = clamp(business.marketOpportunity, 0, 100);
  const competitivePosition = clamp(business.competitivePosition, 0, 100);
  const brandStrength = clamp(business.brandStrength, 0, 100);
  const productLeadership = clamp(business.productLeadership, 0, 100);
  const innovation = clamp(business.innovation, 0, 100);
  const customerRetention = clamp(business.customerRetention, 0, 100);
  const recurringRevenue = clamp(business.recurringRevenue, 0, 100);

  const score = clamp(
    round(
      scalableBusiness * 0.18 +
        marketOpportunity * 0.14 +
        competitivePosition * 0.14 +
        brandStrength * 0.12 +
        productLeadership * 0.12 +
        innovation * 0.1 +
        customerRetention * 0.1 +
        recurringRevenue * 0.1,
      1
    ),
    config.scoreFloor,
    config.scoreCeiling
  );

  if (score >= config.minBusinessQualityBuy) {
    reasons.push(
      "Business continues to scale while maintaining profitability."
    );
  }
  if (score < config.minBusinessQualityWatch) {
    warnings.push("Weak Business quality.");
  }

  return {
    score,
    scalableBusiness,
    marketOpportunity,
    competitivePosition,
    brandStrength,
    productLeadership,
    innovation,
    customerRetention,
    recurringRevenue,
    reasons,
    warnings,
  };
}
