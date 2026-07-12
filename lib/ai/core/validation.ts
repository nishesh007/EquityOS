/**
 * Zod request schemas for AI API routes.
 */

import { z } from "zod";

export const symbolSchema = z
  .string()
  .trim()
  .max(32)
  .regex(/^[A-Za-z0-9.&-]+$/)
  .transform((value) => value.toUpperCase())
  .nullable()
  .optional();

export const conversationMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(32_000),
});

export const chatRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(8_000),
  symbol: symbolSchema,
  conversationId: z.string().trim().max(64).optional(),
});

export const compareRequestSchema = z.object({
  symbols: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(32)
        .regex(/^[A-Za-z0-9.&-]+$/)
        .transform((value) => value.toUpperCase())
    )
    .min(2)
    .max(5),
});

export const explainTargetSchema = z.object({
  type: z.enum(["ratio", "financial_row", "chart", "technical", "score"]),
  key: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(200),
  symbol: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .regex(/^[A-Za-z0-9.&-]+$/)
    .transform((value) => value.toUpperCase()),
  value: z.union([z.string(), z.number()]).optional().nullable(),
  pageContext: z.string().trim().max(80).optional().nullable(),
  detail: z.string().trim().max(2_000).optional().nullable(),
});

export const explainRequestSchema = z.object({
  target: explainTargetSchema,
});

export const followUpRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(8_000),
  answer: z.string().trim().min(1).max(64_000),
  symbol: symbolSchema,
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type CompareRequest = z.infer<typeof compareRequestSchema>;
export type ExplainRequest = z.infer<typeof explainRequestSchema>;
export type FollowUpRequest = z.infer<typeof followUpRequestSchema>;
