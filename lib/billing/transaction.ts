/**
 * Transaction + retry managers — Sprint 12B.
 */

import type { TransactionRecord, TransactionStatus } from "./types";
import { createId, nowIso } from "@/lib/saas/utils";

export function createPendingTransaction(
  partial: Omit<TransactionRecord, "id" | "createdAt" | "updatedAt" | "status"> & {
    status?: TransactionStatus;
  }
): TransactionRecord {
  const ts = nowIso();
  return {
    ...partial,
    id: createId("txn"),
    status: partial.status ?? "pending",
    createdAt: ts,
    updatedAt: ts,
  };
}

export function updateTransactionStatus(
  txn: TransactionRecord,
  status: TransactionStatus,
  patch?: Partial<TransactionRecord>
): TransactionRecord {
  return {
    ...txn,
    ...patch,
    status,
    updatedAt: nowIso(),
  };
}

export interface RetryState {
  attempts: number;
  maxAttempts: number;
  nextRetryAt: string | null;
  exhausted: boolean;
}

export function createRetryState(maxAttempts = 3): RetryState {
  return { attempts: 0, maxAttempts, nextRetryAt: null, exhausted: false };
}

export function scheduleRetry(
  state: RetryState,
  baseDelayMs = 60_000
): RetryState {
  const attempts = state.attempts + 1;
  if (attempts >= state.maxAttempts) {
    return {
      ...state,
      attempts,
      exhausted: true,
      nextRetryAt: null,
    };
  }
  const delay = baseDelayMs * Math.pow(2, attempts - 1);
  return {
    ...state,
    attempts,
    exhausted: false,
    nextRetryAt: new Date(Date.now() + delay).toISOString(),
  };
}

export function generateReceiptText(txn: TransactionRecord): string {
  return [
    "EQUITYOS PAYMENT RECEIPT",
    `Transaction: ${txn.id}`,
    `Gateway: ${txn.gateway}`,
    `External: ${txn.externalId}`,
    `Amount: ${txn.amount.toFixed(2)} ${txn.currency}`,
    `Status: ${txn.status}`,
    `Date: ${txn.updatedAt}`,
    `Description: ${txn.description}`,
  ].join("\n");
}
