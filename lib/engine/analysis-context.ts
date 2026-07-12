/**
 * Shared analysis context for Sprint 7C research engines.
 * Combines UI profile with enriched fundamentals bundle data.
 */

import type { FundamentalsBundle } from "@/lib/fundamentals/types";
import type { FinancialFundamentals } from "@/lib/fundamentals/types";
import type { CompanyProfile } from "@/types";

export interface AnalysisContext {
  profile: CompanyProfile;
  bundle?: FundamentalsBundle;
  fundamentals?: FinancialFundamentals;
}

export function createAnalysisContext(
  profile: CompanyProfile,
  bundle?: FundamentalsBundle,
  fundamentals?: FinancialFundamentals
): AnalysisContext {
  return {
    profile,
    bundle,
    fundamentals: fundamentals ?? profile.fundamentals,
  };
}
