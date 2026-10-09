import { monthKey, padDatePart } from "../../utils/date.js";

const EXPENSES_URL = "https://api-centsible.vercel.app/expenses";

export async function updateExpense(expenseId, changes) {
  if (Object.keys(changes).length === 0) return;

  let response;
  try {
    response = await fetch(
      `${EXPENSES_URL}/${encodeURIComponent(expenseId)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      },
    );
  } catch {
    throw new Error("Could not connect to the expenses API.");
  }

  if (!response.ok) {
    throw new Error(`The expense update failed (${response.status}).`);
  }
}

function normalizeExpense(expense) {
  if (
    expense === null ||
    typeof expense !== "object" ||
    !Number.isInteger(expense.id) ||
    !Number.isInteger(expense.category_id) ||
    !Number.isFinite(expense.amount) ||
    expense.amount < 0 ||
    typeof expense.expense_date !== "string" ||
    typeof expense.created_at !== "string"
  ) {
    throw new Error("The expenses API returned an invalid expense.");
  }

  const dateValue = new Date(expense.expense_date);
  const createdAt = new Date(expense.created_at);
  if (
    Number.isNaN(dateValue.getTime()) ||
    Number.isNaN(createdAt.getTime())
  ) {
    throw new Error("The expenses API returned an invalid expense date.");
  }

  const date = `${monthKey(dateValue)}-${padDatePart(dateValue.getDate())}`;
  const note = [expense.merchant, expense.bank]
    .filter((value) => typeof value === "string" && value.trim())
    .join(" · ");
  const time = /[T ]\d{2}:\d{2}/.test(expense.expense_date)
    ? dateValue.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  return {
    id: String(expense.id),
    categoryId: String(expense.category_id),
    amount: Math.round(expense.amount * 100) / 100,
    date,
    time,
    createdAt: createdAt.toISOString(),
    merchant: typeof expense.merchant === "string" ? expense.merchant : "",
    bank: typeof expense.bank === "string" ? expense.bank : "",
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
