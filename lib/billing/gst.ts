/**
 * GST helpers — Sprint 12B.
 */

import { GST_RATE, type InvoiceKind, type TaxBreakdown } from "./types";

export function computeGst(input: {
  taxableAmount: number;
  state: string;
  sellerState?: string;
  gstin: string | null;
  kind: InvoiceKind;
}): TaxBreakdown {
  const sellerState = input.sellerState ?? "KA";
  const interstate = input.state.trim().toUpperCase() !== sellerState;
  const tax = Math.round(input.taxableAmount * GST_RATE * 100) / 100;
  if (interstate) {
    return {
      cgst: 0,
      sgst: 0,
      igst: tax,
      reverseCharge: false,
      gstin: input.gstin,
    };
  }
  const half = Math.round((tax / 2) * 100) / 100;
  return {
    cgst: half,
    sgst: half,
    igst: 0,
    reverseCharge: false,
    gstin: input.gstin,
  };
}

export function taxTotal(tax: TaxBreakdown): number {
  return Math.round((tax.cgst + tax.sgst + tax.igst) * 100) / 100;
}

export function formatGstSummary(tax: TaxBreakdown): string {
  if (tax.igst > 0) return `IGST ${tax.igst.toFixed(2)}`;
  return `CGST ${tax.cgst.toFixed(2)} + SGST ${tax.sgst.toFixed(2)}`;
}
