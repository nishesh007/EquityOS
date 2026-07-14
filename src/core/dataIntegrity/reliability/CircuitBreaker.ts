/**
 * Circuit breaker — Closed / Open / Half-Open with automatic recovery.
 * Circuit state never alters validation correctness; it only gates infrastructure calls.
 */

import type { ReliabilityConfiguration } from "./ReliabilityConfiguration";

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerStatus {
  circuitId: string;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  openedAt: string | null;
  lastFailureAt: string | null;
  lastSuccessAt: string | null;
  trips: number;
}

export class CircuitBreaker {
  private readonly circuits = new Map<string, CircuitBreakerStatus>();

  constructor(private config: ReliabilityConfiguration) {}

  setConfiguration(config: ReliabilityConfiguration): void {
    this.config = config;
  }

  getOrCreate(circuitId: string): CircuitBreakerStatus {
    const existing = this.circuits.get(circuitId);
    if (existing) return this.refresh(existing);
    const created: CircuitBreakerStatus = {
      circuitId,
      state: "CLOSED",
      failureCount: 0,
      successCount: 0,
      openedAt: null,
      lastFailureAt: null,
      lastSuccessAt: null,
      trips: 0,
    };
    this.circuits.set(circuitId, created);
    return { ...created };
  }

  tripCircuit(circuitId: string, reason?: string): CircuitBreakerStatus {
    const circuit = this.ensure(circuitId);
    circuit.state = "OPEN";
    circuit.openedAt = new Date().toISOString();
    circuit.lastFailureAt = circuit.openedAt;
    circuit.failureCount = Math.max(
      circuit.failureCount,
      this.config.circuitFailureThreshold
    );
    circuit.trips += 1;
    circuit.successCount = 0;
    void reason;
    this.circuits.set(circuitId, circuit);
    return { ...circuit };
  }

  resetCircuit(circuitId: string): CircuitBreakerStatus {
    const circuit = this.ensure(circuitId);
    circuit.state = "CLOSED";
    circuit.failureCount = 0;
    circuit.successCount = 0;
    circuit.openedAt = null;
    this.circuits.set(circuitId, circuit);
    return { ...circuit };
  }

  recordSuccess(circuitId: string): CircuitBreakerStatus {
    const circuit = this.refresh(this.ensure(circuitId));
    circuit.lastSuccessAt = new Date().toISOString();
    if (circuit.state === "HALF_OPEN") {
      circuit.successCount += 1;
      if (circuit.successCount >= this.config.circuitSuccessThreshold) {
        circuit.state = "CLOSED";
        circuit.failureCount = 0;
        circuit.successCount = 0;
        circuit.openedAt = null;
      }
    } else if (circuit.state === "CLOSED") {
      circuit.failureCount = 0;
    }
    this.circuits.set(circuitId, circuit);
    return { ...circuit };
  }

  recordFailure(circuitId: string): CircuitBreakerStatus {
    const circuit = this.refresh(this.ensure(circuitId));
    circuit.lastFailureAt = new Date().toISOString();
    circuit.failureCount += 1;
    circuit.successCount = 0;
    if (
      circuit.state === "HALF_OPEN" ||
      circuit.failureCount >= this.config.circuitFailureThreshold
    ) {
      circuit.state = "OPEN";
      circuit.openedAt = circuit.lastFailureAt;
      circuit.trips += 1;
    }
    this.circuits.set(circuitId, circuit);
    return { ...circuit };
  }

  allowsRequest(circuitId: string): boolean {
    const circuit = this.refresh(this.ensure(circuitId));
    return circuit.state !== "OPEN";
  }

  listCircuits(): CircuitBreakerStatus[] {
    return [...this.circuits.values()].map((c) => ({ ...this.refresh(c) }));
  }

  getTripCount(): number {
    return [...this.circuits.values()].reduce((s, c) => s + c.trips, 0);
  }

  reset(): void {
    this.circuits.clear();
  }

  private ensure(circuitId: string): CircuitBreakerStatus {
    return this.circuits.get(circuitId) ?? this.getOrCreate(circuitId);
  }

  private refresh(circuit: CircuitBreakerStatus): CircuitBreakerStatus {
    if (circuit.state === "OPEN" && circuit.openedAt) {
      const opened = new Date(circuit.openedAt).getTime();
      if (Date.now() - opened >= this.config.circuitRecoveryTimeoutMs) {
        circuit.state = "HALF_OPEN";
        circuit.successCount = 0;
        circuit.failureCount = 0;
      }
    }
    this.circuits.set(circuit.circuitId, circuit);
    return circuit;
  }
}
