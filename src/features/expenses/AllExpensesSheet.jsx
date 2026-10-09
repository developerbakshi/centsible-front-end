import React, { useMemo } from "react";
import { useAppState } from "../../state/AppContext.jsx";
import { formatCategoryName } from "../../utils/category.js";
import { formatCurrencyWithCents } from "../../utils/currency.js";
import { formatDateDDMMYYYY } from "../../utils/date.js";
import "./expenses.css";

function formatCreatedAt(value) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function AllExpensesSheet({ onClose, onEdit }) {
  const { state } = useAppState();
  const expenses = useMemo(
    () =>
      Object.entries(state.data.months)
        .flatMap(([monthKey, month]) =>
          month.exp.map((expense) => ({
            ...expense,
            monthKey,
            category: month.cats.find(({ id }) => id === expense.cat),
          })),
        )
        .sort(
          (first, second) =>
            new Date(second.createdAt).getTime() -
            new Date(first.createdAt).getTime(),
        ),
    [state.data.months],
  );

  return (
    <div className="all-expenses-sheet">
      <div className="sh-h">
        <span>All expenses · {expenses.length}</span>
        <button className="link" type="button" onClick={onClose}>
          Done
        </button>
      </div>
      <div className="all-expenses-list">
        {expenses.length ? (
          expenses.map((expense) => (
            <button
              className="all-expense-row"
              type="button"
              key={`${expense.monthKey}-${expense.id}`}
              aria-label={`Edit ${expense.merchant || expense.note || "expense"}, ${formatCurrencyWithCents(expense.amt)}`}
              onClick={() => onEdit(expense.id, expense.monthKey)}
            >
              <span className="all-expense-main">
                <span className="all-expense-merchant">
                  {expense.merchant || expense.note || "Expense"}
                </span>
                <b>{formatCurrencyWithCents(expense.amt)}</b>
              </span>
              <span className="all-expense-meta">
                <span>
                  {expense.category
                    ? `${expense.category.emoji} ${formatCategoryName(expense.category.name)}`
                    : "Category unavailable"}
                </span>
                <span>Expense date {formatDateDDMMYYYY(expense.date)}</span>
              </span>
              {expense.bank && (
                <span className="all-expense-bank">{expense.bank}</span>
              )}
              {expense.createdAt && (
                <span className="all-expense-created">
                  Created {formatCreatedAt(expense.createdAt)}
                </span>
              )}
            </button>
          ))
        ) : (
          <div className="empty">No expenses yet.</div>
        )}
      </div>
    </div>
  );
}

export default AllExpensesSheet;
