export function formatPrice(price: string | number): string {
  return `${Number(price).toFixed(2)} $`;
}
