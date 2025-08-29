// CURRENCY FORCED TO PHP ONLY
// This function now always returns PHP symbol regardless of input
export const getCurrencySymbol = (currency: string): string => {
  // Always return PHP symbol - all other currencies disabled
  return '₱';
};
