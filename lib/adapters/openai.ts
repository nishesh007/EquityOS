import { BaseDataAdapter } from "@/lib/adapters/types";

export interface OpenAIParams {
  prompt: string;
  model?: string;
  context?: Record<string, unknown>;
}

export interface OpenAIResult {
  content: string;
  model: string;
  tokensUsed?: number;
}

export class OpenAIAdapter extends BaseDataAdapter<OpenAIParams, OpenAIResult> {
  readonly provider = "OpenAI";

  async fetch(_params: OpenAIParams): Promise<OpenAIResult> {
    this.notConnected();
  }
}

export const openaiAdapter = new OpenAIAdapter();
