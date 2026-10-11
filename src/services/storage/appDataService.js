const APP_DATA_KEY = "centsible.v2";

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isValidAppData(data) {
  if (!isObject(data) || !isObject(data.months)) return false;
  if (Object.keys(data.months).length === 0) return false;
  if (!["", "light", "dark"].includes(data.theme)) return false;

  return Object.entries(data.months).every(([key, month]) => {
    if (!/^\d{4}-\d{2}$/.test(key) || !isObject(month)) return false;
    if (!Number.isFinite(month.budget)) return false;
    if (!Array.isArray(month.cats) || !Array.isArray(month.exp)) return false;

    const validCategories = month.cats.every(
      (category) =>
        isObject(category) &&
        typeof category.id === "string" &&
        typeof category.name === "string" &&
        typeof category.emoji === "string" &&
        Number.isFinite(category.limit),
    );
    const validExpenses = month.exp.every(
      (expense) =>
        isObject(expense) &&
        typeof expense.id === "string" &&
        typeof expense.cat === "string" &&
        Number.isFinite(expense.amt) &&
        typeof expense.date === "string" &&
        typeof expense.note === "string",
    );

    return validCategories && validExpenses;
  });
}

export async function loadAppData() {
  const stored = localStorage.getItem(APP_DATA_KEY);
  if (stored === null) return null;

  const data = JSON.parse(stored);
  if (!isValidAppData(data)) {
    throw new Error("Saved Centsible data is invalid.");
  }

  return data;
}

export async function saveAppData(data) {
  if (!isValidAppData(data)) {
    throw new Error("Centsible data is invalid and cannot be saved.");
  }

  localStorage.setItem(APP_DATA_KEY, JSON.stringify(data));
}
