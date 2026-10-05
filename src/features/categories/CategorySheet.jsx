import React, { useState } from "react";
import { useAppState } from "../../state/AppContext.jsx";
import { formatCurrencyWithCents } from "../../utils/currency.js";
import { formatCategoryName } from "../../utils/category.js";
import { formatDateDDMMYYYY } from "../../utils/date.js";
import "./categories.css";

function CategorySheet({ categoryId, onClose, onAdd, onEdit }) {
  const { state, deleteExpense } = useAppState();
  const [error, setError] = useState("");
  const month = state.data.months[state.currentMonth];
  const category = month.cats.find((item) => item.id === categoryId);

  if (!category) {
    return (
      <div className="category-sheet">
        <div className="sh-h">
          <span>Category unavailable</span>
          <button className="link" type="button" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    );
  }

  const expenses = month.exp
    .filter((expense) => expense.cat === categoryId)
    .sort((first, second) => second.date.localeCompare(first.date));
  const spent = expenses.reduce((total, expense) => total + expense.amt, 0);
  const left = category.limit - spent;

  async function handleDelete(expense) {
    setError("");
    try {
      await deleteExpense({
        monthKey: state.currentMonth,
        expenseId: expense.id,
      });
    } catch {
      setError("Could not delete this expense. Please try again.");
    }
  }

  return (
    <div className="category-sheet">
      <div className="sh-h">
        <span>
          {category.emoji} {formatCategoryName(category.name)}
        </span>
        <button className="link" type="button" onClick={onClose}>
          Done
        </button>
      </div>
      <div className="card sl">
        <div>
          <span>Spent</span>
          <b>{formatCurrencyWithCents(spent)}</b>
        </div>
        <div>
          <span>{left < 0 ? "Over by" : "Left"}</span>
          <b className={left < 0 ? "bad" : ""}>
            {formatCurrencyWithCents(Math.abs(left))}
          </b>
        </div>
      </div>
      <div className="card expense-list">
        {expenses.length ? (
          expenses.map((expense) => (
            <div className="exp" key={expense.id}>
              <button
                className="m"
                type="button"
                onClick={() => onEdit(expense.id)}
              >
                <b>{formatCurrencyWithCents(expense.amt)}</b>
                <small>
                  {formatDateDDMMYYYY(expense.date)}
                  {expense.note ? ` · ${expense.note}` : ""}
                </small>
              </button>
              <button
                className="x"
                type="button"
                aria-label="Delete expense (temporarily unavailable)"
                title="Deleting expenses is temporarily unavailable"
                disabled
                onClick={() => handleDelete(expense)}
              >
                🗑
              </button>
            </div>
          ))
        ) : (
          <div className="empty">No expenses in this category yet.</div>
        )}
      </div>
      {error && (
        <div className="err" role="alert">
          {error}
        </div>
      )}
      <div className="expense-action-help">
        Adding and deleting expenses are temporarily unavailable.
      </div>
      <button
        className="save"
        type="button"
        aria-label="Add expense (temporarily unavailable)"
        title="Adding expenses is temporarily unavailable"
        disabled
        onClick={() => onAdd(categoryId)}
      >
        Add expense
      </button>
    </div>
  );
}

export default CategorySheet;
