import { NextResponse } from "next/server";
import { fetchInstitutionalPlatformSnapshot } from "@/services/institutionalValidationData";

/** Read-only Sprint 9F / 9E platform metrics for dashboard exposure. */
export async function GET() {
  const snapshot = await fetchInstitutionalPlatformSnapshot();
  return NextResponse.json(snapshot);
}
