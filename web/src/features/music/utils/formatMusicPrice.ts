export function formatMusicPrice(priceCents: number, currency = 'usd'): string {
  if (!priceCents) return 'Free';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(priceCents / 100);
}
