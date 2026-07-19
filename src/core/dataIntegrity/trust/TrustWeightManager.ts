/**
 * Configurable weight management for the Institutional Trust Score.
 * Supports built-in and unlimited future validation modules.
 */

import {
  BUILTIN_TRUST_MODULE_IDS,
  DEFAULT_TRUST_CONFIGURATION,
  mergeTrustWeights,
  type TrustModuleId,
  type TrustWeightMap,
} from "./TrustConfiguration";

export class TrustWeightManager {
  private weights: TrustWeightMap;

  constructor(weights?: Partial<TrustWeightMap>) {
    this.weights = mergeTrustWeights(DEFAULT_TRUST_CONFIGURATION.weights, weights);
  }

  getWeights(): TrustWeightMap {
    return { ...this.weights };
  }

  setWeight(moduleId: TrustModuleId, weight: number): void {
    if (!Number.isFinite(weight) || weight < 0) {
      throw new Error(`Invalid trust weight for module "${moduleId}": ${weight}`);
    }
    this.weights[moduleId] = weight;
  }

  setWeights(weights: Partial<TrustWeightMap>): void {
    for (const [moduleId, weight] of Object.entries(weights)) {
      if (weight === undefined) continue;
      this.setWeight(moduleId, weight);
    }
  }

  removeWeight(moduleId: TrustModuleId): void {
    if ((BUILTIN_TRUST_MODULE_IDS as readonly string[]).includes(moduleId)) {
      throw new Error(`Cannot remove built-in trust module weight: ${moduleId}`);
    }
    delete this.weights[moduleId];
  }

  /** Normalize weights so they sum to 1.0 (or leave empty map unchanged). */
  normalize(): TrustWeightMap {
    const keys = Object.keys(this.weights);
    const sum = keys.reduce((acc, key) => acc + (this.weights[key] ?? 0), 0);
    if (sum <= 0) return this.getWeights();
    for (const key of keys) {
      this.weights[key] = (this.weights[key] ?? 0) / sum;
    }
    return this.getWeights();
  }

  /** Return a normalized copy without mutating internal state. */
  getNormalizedWeights(): TrustWeightMap {
    const clone = new TrustWeightManager(this.weights);
    return clone.normalize();
  }

  getWeight(moduleId: TrustModuleId): number {
    return this.weights[moduleId] ?? 0;
  }

  moduleIds(): string[] {
    return Object.keys(this.weights);
  }
}
