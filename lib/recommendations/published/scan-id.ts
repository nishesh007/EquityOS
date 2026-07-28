/** NSE session scan identifier: YYYY-MM-DD:scanCount */
export function buildPublishedScanId(
  sessionId: string,
  scanCount: number
): string {
  return `${sessionId}:${scanCount}`;
}
