/**
 * Complete Strategy Platform catalog.
 *
 * This is the only production registration list. It imports existing
 * registration descriptors and registers them idempotently; strategy logic
 * remains in each concrete module.
 */

import { createBreakoutRetestStrategyRegistration } from "./breakoutRetest/BreakoutRetestStrategy";
import { createBuffettStrategyRegistration } from "./buffett/BuffettStrategy";
import { createCupHandleStrategyRegistration } from "./cupHandle/CupHandleStrategy";
import { createDarvasBoxStrategyRegistration } from "./darvasBox/DarvasBoxStrategy";
import { createEarningsMomentumStrategyRegistration } from "./earningsMomentum/EarningsMomentumStrategy";
import { createEMAPullbackStrategyRegistration } from "./emaPullback/EMAPullbackStrategy";
import { createFiftyTwoWeekHighStrategyRegistration } from "./fiftyTwoWeekHigh/FiftyTwoWeekHighStrategy";
import { createFlatBaseStrategyRegistration } from "./flatBase/FlatBaseStrategy";
import { createGrahamStrategyRegistration } from "./graham/GrahamStrategy";
import { createInstitutionalAccumulationStrategyRegistration } from "./institutionalAccumulation/InstitutionalAccumulationStrategy";
import { createLiquiditySweepStrategyRegistration } from "./liquiditySweep/LiquiditySweepStrategy";
import { createMagicFormulaStrategyRegistration } from "./magicFormula/MagicFormulaStrategy";
import { createMomentumContinuationStrategyRegistration } from "./momentumContinuation/MomentumContinuationStrategy";
import { createNewsMomentumStrategyRegistration } from "./newsMomentum/NewsMomentumStrategy";
import { createORBStrategyRegistration } from "./orb/ORBStrategy";
import { createPeterLynchStrategyRegistration } from "./peterLynch/PeterLynchStrategy";
import { createQualityCompounderStrategyRegistration } from "./qualityCompounder/QualityCompounderStrategy";
import { createRelativeStrengthIntradayStrategyRegistration } from "./relativeStrengthIntraday/RelativeStrengthIntradayStrategy";
import { createRelativeStrengthLeadershipStrategyRegistration } from "./relativeStrengthLeadership/RelativeStrengthLeadershipStrategy";
import { createSectorRotationStrategyRegistration } from "./sectorRotation/SectorRotationStrategy";
import { createStageAnalysisStrategyRegistration } from "./stageAnalysis/StageAnalysisStrategy";
import { createVCPStrategyRegistration } from "./vcp/VCPStrategy";
import { createVWAPContinuationStrategyRegistration } from "./vwapContinuation/VWAPContinuationStrategy";
import { createVWAPMeanReversionStrategyRegistration } from "./vwapMeanReversion/VWAPMeanReversionStrategy";
import type { StrategyRegistry } from "./StrategyRegistry";
import type { StrategyRegistration } from "./StrategyTypes";

export const STRATEGY_PLATFORM_VERSION = "11B.4";

export function createAllStrategyRegistrations(): StrategyRegistration[] {
  return [
    createORBStrategyRegistration(),
    createVWAPContinuationStrategyRegistration(),
    createVWAPMeanReversionStrategyRegistration(),
    createLiquiditySweepStrategyRegistration(),
    createMomentumContinuationStrategyRegistration(),
    createRelativeStrengthIntradayStrategyRegistration(),
    createInstitutionalAccumulationStrategyRegistration(),
    createBreakoutRetestStrategyRegistration(),
    createSectorRotationStrategyRegistration(),
    createNewsMomentumStrategyRegistration(),
    createVCPStrategyRegistration(),
    createStageAnalysisStrategyRegistration(),
    createDarvasBoxStrategyRegistration(),
    createRelativeStrengthLeadershipStrategyRegistration(),
    createEMAPullbackStrategyRegistration(),
    createCupHandleStrategyRegistration(),
    createFlatBaseStrategyRegistration(),
    createFiftyTwoWeekHighStrategyRegistration(),
    createEarningsMomentumStrategyRegistration(),
    createBuffettStrategyRegistration(),
    createGrahamStrategyRegistration(),
    createPeterLynchStrategyRegistration(),
    createMagicFormulaStrategyRegistration(),
    createQualityCompounderStrategyRegistration(),
  ];
}

export function registerAllStrategies(registry: StrategyRegistry): number {
  let registered = 0;
  for (const registration of createAllStrategyRegistrations()) {
    if (registry.has(registration.id)) continue;
    if (registry.register(registration)) registered += 1;
  }
  return registered;
}

export function getStrategyCatalogSize(): number {
  return createAllStrategyRegistrations().length;
}
