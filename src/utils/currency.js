const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const usdWhole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function roundedDollars(amount) {
  return Math.round(amount * 100) / 100;
}

export function parseDollarAmount(value) {
  const normalized = value.trim();
  if (!/^-?(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(normalized)) {
    return null;
  }

  const completeValue = normalized.endsWith(".")
    ? normalized.slice(0, -1)
    : normalized;
  return roundedDollars(Number(completeValue));
}

export function formatCurrency(amount) {
  const rounded = roundedDollars(amount);
  return Math.abs(rounded % 1) < Number.EPSILON
    ? usdWhole.format(rounded)
    : usd.format(rounded);
}

export function formatCurrencyWithCents(amount) {
  return usd.format(roundedDollars(amount));
}
