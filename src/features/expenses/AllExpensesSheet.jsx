import React, { useMemo, useState } from "react";
import { useAppState } from "../../state/AppContext.jsx";
import { formatCategoryName } from "../../utils/category.js";
import { formatCurrencyWithCents } from "../../utils/currency.js";
import { formatDateDDMMYYYY } from "../../utils/date.js";
import SwipeableExpenseRow from "./SwipeableExpenseRow.jsx";
import "./expenses.css";

function AllExpensesSheet({ onClose, onEdit, onRequestDelete }) {
  const { state } = useAppState();
  const [openExpenseId, setOpenExpenseId] = useState(null);
  const selectedMonth = state.data.months[state.currentMonth];
  const expenses = useMemo(
    () =>
      selectedMonth.exp
        .map((expense) => ({
          ...expense,
          monthKey: state.currentMonth,
          category: selectedMonth.cats.find(({ id }) => id === expense.cat),
        }))
        .sort(
          (first, second) =>
            new Date(second.createdAt).getTime() -
            new Date(first.createdAt).getTime(),
        ),
    [selectedMonth, state.currentMonth],
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
            <SwipeableExpenseRow
              key={`${expense.monthKey}-${expense.id}`}
              expense={expense}
              monthKey={expense.monthKey}
              isOpen={openExpenseId === expense.id}
              onOpenChange={setOpenExpenseId}
              onEdit={onEdit}
              onRequestDelete={onRequestDelete}
            >
              <span className="all-expense-content">
                <span className="all-expense-main">
                  <span className="all-expense-merchant">
                    {expense.merchant || expense.note || "Expense"}
                  </span>
                  <b>{formatCurrencyWithCents(expense.amt)}</b>
                </span>
                <span className="all-expense-meta">
                  <span className="all-expense-category">
                    {expense.category && (
                      <span
                        className="all-expense-category-icon"
                        aria-hidden="true"
                      >
                        {expense.category.emoji}
                      </span>
                    )}
                    <span className="all-expense-category-name">
                      {expense.category
                        ? formatCategoryName(expense.category.name)
                        : "Category unavailable"}
                    </span>
                  </span>
                  {expense.bank && (
                    <>
                      <span className="all-expense-bank">{expense.bank}</span>
                      <span
                        className="all-expense-separator"
                        aria-hidden="true"
                      >
                        ·
                      </span>
                    </>
                  )}
                  <span className="all-expense-date">
                    {formatDateDDMMYYYY(expense.date)}
                  </span>
                  {expense.time && (
                    <>
                      <span
                        className="all-expense-separator"
                        aria-hidden="true"
                      >
                        ·
                      </span>
                      <span className="all-expense-time">{expense.time}</span>
                    </>
                  )}
                </span>
              </span>
            </SwipeableExpenseRow>
          ))
        ) : (
          <div className="empty">No expenses yet.</div>
        )}
      </div>
    </div>
  );
}

export default AllExpensesSheet;
