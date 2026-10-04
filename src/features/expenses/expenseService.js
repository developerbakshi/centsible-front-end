import { saveAppData } from "../../services/storage/appDataService.js";
import { daysInMonth } from "../../utils/date.js";

function createId() {
  return Math.random().toString(36).slice(2, 9);
}

function isValidExpense(monthData, categoryId, amount, date, monthKey) {
  if (!Number.isFinite(amount) || amount === 0) {
    return false;
  }
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const [year, month, day] = date.split("-").map(Number);
  const dateMonthKey = `${year}-${String(month).padStart(2, "0")}`;
  const validDate =
    dateMonthKey === monthKey &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month);

  return (
    validDate &&
    monthData.cats.some((category) => category.id === categoryId)
  );
}

async function saveMonth(data, monthKey, month) {
  const updatedData = {
    ...data,
    months: { ...data.months, [monthKey]: month },
  };
  await saveAppData(updatedData);
  return updatedData;
}

export async function addExpense(
  data,
  { categoryId, amount, date, note },
) {
  const monthKey = date?.slice(0, 7);
  const monthData = data.months[monthKey];

  if (!monthData || !isValidExpense(monthData, categoryId, amount, date, monthKey)) {
    throw new Error("Expense details are invalid for the selected month.");
  }

  const expense = {
    id: createId(),
    cat: categoryId,
    amt: Math.round(amount * 100) / 100,
    date,
    note: note.trim(),
  };
  return saveMonth(data, monthKey, {
    ...monthData,
    exp: [...monthData.exp, expense],
  });
}

export async function updateExpense(
  data,
  { monthKey, expenseId, categoryId, amount, date, note },
) {
  const monthData = data.months[monthKey];
  const expenseIndex = monthData?.exp.findIndex(({ id }) => id === expenseId);

  if (
    !monthData ||
    expenseIndex < 0 ||
    !isValidExpense(monthData, categoryId, amount, date, monthKey)
  ) {
    throw new Error("Expense details are invalid for the selected month.");
  }

  const expenses = [...monthData.exp];
  expenses[expenseIndex] = {
    ...expenses[expenseIndex],
    cat: categoryId,
    amt: Math.round(amount * 100) / 100,
    date,
    note: note.trim(),
  };
  return saveMonth(data, monthKey, { ...monthData, exp: expenses });
}

export async function deleteExpense(data, { monthKey, expenseId }) {
  const monthData = data.months[monthKey];
  if (!monthData?.exp.some(({ id }) => id === expenseId)) {
    throw new Error("Expense is no longer available.");
  }

  const expenses = monthData.exp.filter(({ id }) => id !== expenseId);
  return saveMonth(data, monthKey, { ...monthData, exp: expenses });
}
