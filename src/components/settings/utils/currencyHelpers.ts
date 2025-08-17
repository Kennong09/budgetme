export const getCurrencySymbol = (currency: string): string => {
  const symbols: Record<string, string> = {
    PHP: '₱',
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CAD: '$',
    AUD: '$',
  };
  return symbols[currency] || '$';
};
