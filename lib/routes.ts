export function getCompanyRoute(symbol: string): string {
  return `/company/${symbol.toUpperCase()}`;
}
