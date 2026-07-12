/**
 * Security utilities — prompt injection protection, input sanitization, XSS hardening.
 */

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|prior|system)\s+(instructions|prompts)/i,
  /you\s+are\s+now\s+(a|an)\s+/i,
  /act\s+as\s+(if\s+you\s+are\s+)?(a|an)\s+/i,
  /system\s*:\s*/i,
  /<\s*script\b/i,
  /javascript\s*:/i,
  /on\w+\s*=\s*["']/i,
  /```\s*system/i,
  /\bDAN\b.*\bmode\b/i,
];

const CONTROL_CHAR_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export interface SanitizeResult {
  value: string;
  blocked: boolean;
  reasons: string[];
}

export function stripControlCharacters(input: string): string {
  return input.replace(CONTROL_CHAR_PATTERN, "");
}

export function escapeHtmlForDisplay(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function detectPromptInjection(input: string): string[] {
  const reasons: string[] = [];
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      reasons.push(`Matched injection pattern: ${pattern.source}`);
    }
  }
  return reasons;
}

export function sanitizeUserPrompt(input: string, maxLength: number): SanitizeResult {
  const trimmed = stripControlCharacters(input.trim());
  const reasons = detectPromptInjection(trimmed);

  if (trimmed.length > maxLength) {
    return {
      value: trimmed.slice(0, maxLength),
      blocked: true,
      reasons: [...reasons, `Prompt exceeds ${maxLength} characters`],
    };
  }

  if (reasons.length > 0) {
    return {
      value: trimmed,
      blocked: true,
      reasons,
    };
  }

  return { value: trimmed, blocked: false, reasons: [] };
}

export function sanitizeSymbol(input: string | null | undefined): string | null {
  if (!input) return null;
  const cleaned = input.trim().toUpperCase().replace(/[^A-Z0-9.&-]/g, "");
  return cleaned.length > 0 && cleaned.length <= 32 ? cleaned : null;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}
