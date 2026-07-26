/**
 * Email templates — Sprint 12C (queued outbox, no live SMTP).
 */

import type { EmailTemplateId } from "./types";

const TEMPLATES: Record<
  EmailTemplateId,
  { subject: string; body: (vars: Record<string, string>) => string }
> = {
  welcome: {
    subject: "Welcome to EquityOS",
    body: (v) => `Hi ${v.name ?? "there"},\n\nWelcome to EquityOS. Your workspace is ready.`,
  },
  verify_email: {
    subject: "Verify your EquityOS email",
    body: (v) => `Verify your email using this token: ${v.token ?? ""}`,
  },
  password_reset: {
    subject: "Reset your EquityOS password",
    body: (v) => `Reset link token: ${v.token ?? ""}\nExpires soon.`,
  },
  trial_started: {
    subject: "Your EquityOS trial has started",
    body: (v) => `Trial for ${v.plan ?? "Professional"} is active for ${v.days ?? "14"} days.`,
  },
  trial_expiring: {
    subject: "Your EquityOS trial is expiring",
    body: (v) => `Your trial expires in ${v.days ?? "3"} days. Upgrade to keep access.`,
  },
  subscription_activated: {
    subject: "Subscription activated",
    body: (v) => `Your ${v.plan ?? "plan"} subscription is now active.`,
  },
  subscription_renewed: {
    subject: "Subscription renewed",
    body: (v) => `Renewal confirmed for ${v.plan ?? "your plan"}.`,
  },
  subscription_cancelled: {
    subject: "Subscription cancelled",
    body: () => `Your subscription has been cancelled. Access continues until period end.`,
  },
  payment_failed: {
    subject: "Payment failed",
    body: (v) => `We could not process payment ${v.amount ?? ""}. Please update your method.`,
  },
  invoice_generated: {
    subject: "Your EquityOS invoice",
    body: (v) => `Invoice ${v.invoiceNumber ?? ""} is ready. Total: ${v.total ?? ""}.`,
  },
  license_assigned: {
    subject: "License assigned",
    body: (v) => `License ${v.licenseKey ?? ""} has been assigned to your account.`,
  },
  research_shared: {
    subject: "Research shared with you",
    body: (v) => `${v.actor ?? "A teammate"} shared research: ${v.title ?? "report"}.`,
  },
};

export function renderEmailTemplate(
  templateId: EmailTemplateId,
  vars: Record<string, string> = {}
): { subject: string; body: string } {
  const t = TEMPLATES[templateId];
  return { subject: t.subject, body: t.body(vars) };
}

export function listEmailTemplates(): EmailTemplateId[] {
  return Object.keys(TEMPLATES) as EmailTemplateId[];
}
