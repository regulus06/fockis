export function formatCurrency(amount: number, currency = 'USD', locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Bare number formatting for the mono price styling used in the design (e.g. "$120"). */
export function formatPrice(amount: number): string {
  return `$${amount % 1 === 0 ? amount : amount.toFixed(2)}`;
}
