import React, { useState } from "react";
import { useAppState } from "../../state/AppContext.jsx";
import {
  formatCurrency,
  formatCurrencyWithCents,
} from "../../utils/currency.js";
import { formatCategoryName } from "../../utils/category.js";
import { formatDateDDMMYYYY } from "../../utils/date.js";
import { calculateCategoryWeeks } from "../week/weekCalculations.js";
import SwipeableExpenseRow from "../expenses/SwipeableExpenseRow.jsx";
import "./categories.css";

function formatWeekRange(monthKey, week) {
  const [year, month] = monthKey.split("-").map(Number);
  const start = new Date(year, month - 1, week.startDay);
  const monthLabel = start.toLocaleDateString("en-US", { month: "short" });
  return week.startDay === week.endDay
    ? `${monthLabel} ${week.startDay}`
    : `${monthLabel} ${week.startDay}–${week.endDay}`;
}

function CategorySheet({ categoryId, onClose, onAdd, onEdit, onRequestDelete }) {
  const { state } = useAppState();
  const [openExpenseId, setOpenExpenseId] = useState(null);
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
  const weeklyBudgets = calculateCategoryWeeks({
    monthKey: state.currentMonth,
    category,
    expenses: month.exp,
  });

  return (
    <div className="category-sheet">
      <div className="sh-h category-sheet-header">
        <button className="link" type="button" onClick={() => onAdd(categoryId)}>
          + Add
        </button>
        <span className="category-sheet-title">
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
      <section className="category-weekly">
        <h2>Weekly budget</h2>
        <div className="category-weekly-table">
          <div className="category-weekly-row is-heading" aria-hidden="true">
            <span>Week</span>
            <span>Allowed</span>
            <span>Spent</span>
            <span>Left</span>
          </div>
          {weeklyBudgets.map((week) => (
            <div
              className={`category-weekly-row${week.isFuture ? " is-future" : ""}${week.isCurrent ? " is-current" : ""}`}
              key={week.start}
            >
              <span>{formatWeekRange(state.currentMonth, week)}</span>
              <span>{formatCurrency(week.allowance)}</span>
              <span>{week.isFuture ? "—" : formatCurrency(week.spent)}</span>
              <span>
                {week.isFuture
                  ? ""
                  : week.left < 0
                    ? `−${formatCurrency(Math.abs(week.left))}`
                    : formatCurrency(week.left)}
              </span>
            </div>
          ))}
        </div>
        {spent > category.limit && (
          <p className="category-weekly-over">
            Over monthly limit by {formatCurrency(spent - category.limit)}.
            Later weeks show $0.
          </p>
        )}
      </section>
      <div className="card expense-list">
        {expenses.length ? (
          expenses.map((expense) => (
            <SwipeableExpenseRow
              key={expense.id}
              expense={expense}
              monthKey={state.currentMonth}
              isOpen={openExpenseId === expense.id}
              onOpenChange={setOpenExpenseId}
              onEdit={(expenseId) => onEdit(expenseId)}
              onRequestDelete={onRequestDelete}
            >
              <span className="category-expense-content">
                <b>{formatCurrencyWithCents(expense.amt)}</b>
                <small>
                  {formatDateDDMMYYYY(expense.date)}
                  {expense.note ? ` · ${expense.note}` : ""}
                </small>
              </span>
            </SwipeableExpenseRow>
          ))
        ) : (
          <div className="empty">No expenses in this category yet.</div>
        )}
      </div>
    </div>
  );
}

export default CategorySheet;
