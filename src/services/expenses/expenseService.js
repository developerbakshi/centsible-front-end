import { monthKey, padDatePart } from "../../utils/date.js";

const EXPENSES_URL = "https://api-centsible.onrender.com/expenses";

function normalizeExpense(expense) {
  if (
    expense === null ||
    typeof expense !== "object" ||
    !Number.isInteger(expense.id) ||
    !Number.isInteger(expense.category_id) ||
    !Number.isFinite(expense.amount) ||
    expense.amount < 0 ||
    typeof expense.expense_date !== "string"
  ) {
    throw new Error("The expenses API returned an invalid expense.");
  }

  const dateValue = new Date(expense.expense_date);
  if (Number.isNaN(dateValue.getTime())) {
    throw new Error("The expenses API returned an invalid expense date.");
  }

  const date = `${monthKey(dateValue)}-${padDatePart(dateValue.getDate())}`;
  const note = [expense.merchant, expense.bank]
    .filter((value) => typeof value === "string" && value.trim())
    .join(" · ");

  return {
    id: String(expense.id),
    categoryId: String(expense.category_id),
    amount: Math.round(expense.amount * 100) / 100,
    date,
    note,
  };
}

export async function getExpenses() {
  let response;
  try {
    response = await fetch(EXPENSES_URL);
  } catch {
    throw new Error("Could not connect to the expenses API.");
  }

  if (!response.ok) {
    throw new Error(`The expenses API request failed (${response.status}).`);
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("The expenses API returned invalid JSON.");
  }

  if (!Array.isArray(result)) {
    throw new Error("The expenses API returned an invalid response.");
  }

  return result.map(normalizeExpense);
}
