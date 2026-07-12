/**
 * Base contract for all external API adapters.
 * Adapters are prepared but not connected in Sprint 6.
 */

export type AdapterStatus = "stub" | "ready" | "connected" | "error";

export interface AdapterConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
}

export interface AdapterHealth {
  status: AdapterStatus;
  provider: string;
  message: string;
  lastChecked?: string;
}

export interface DataAdapter<TParams = unknown, TResult = unknown> {
  readonly provider: string;
  readonly status: AdapterStatus;
  healthCheck(): Promise<AdapterHealth>;
  fetch(params: TParams): Promise<TResult>;
}

export abstract class BaseDataAdapter<TParams, TResult>
  implements DataAdapter<TParams, TResult>
{
  abstract readonly provider: string;

  constructor(protected readonly config: AdapterConfig = {}) {}

  get status(): AdapterStatus {
    return "stub";
  }

  async healthCheck(): Promise<AdapterHealth> {
    return {
      status: this.status,
      provider: this.provider,
      message: `${this.provider} adapter is prepared but not connected.`,
      lastChecked: new Date().toISOString(),
    };
  }

  abstract fetch(params: TParams): Promise<TResult>;

  protected notConnected(): never {
    throw new Error(
      `${this.provider} adapter is not connected. Implement API integration in a future sprint.`
    );
  }
}
