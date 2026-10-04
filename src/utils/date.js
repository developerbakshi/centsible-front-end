export function padDatePart(value) {
  return String(value).padStart(2, "0");
}

export function monthKey(date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}`;
}

export function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

export function getDaysLeft(key, date = new Date()) {
  const [year, month] = key.split("-").map(Number);
  const currentKey = monthKey(date);
  const monthLength = daysInMonth(year, month);

  if (key < currentKey) return 0;
  if (key > currentKey) return monthLength;
  return monthLength - date.getDate() + 1;
}

export function formatMonthLabel(key) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function formatDateDDMMYYYY(value) {
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}

export function shiftMonth(key, amount) {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1 + amount, 1);
  return monthKey(date);
}
