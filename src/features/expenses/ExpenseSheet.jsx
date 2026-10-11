import React, { useEffect, useRef, useState } from "react";
import { useAppState } from "../../state/AppContext.jsx";
import { formatCategoryName } from "../../utils/category.js";
import { parseDollarAmount } from "../../utils/currency.js";
import { daysInMonth, monthKey, padDatePart } from "../../utils/date.js";
import "./expenses.css";

function getDefaultDate(currentMonth) {
  const today = new Date();
  if (currentMonth === monthKey(today)) {
    return `${currentMonth}-${padDatePart(today.getDate())}`;
  }
  return `${currentMonth}-01`;
}

function isAllowedAmountInput(value) {
  return /^-?(?:\d+(?:\.\d{0,2})?|\.\d{0,2})?$/.test(value);
}

function ExpenseSheet({
  onClose,
  preselectedCategoryId = null,
  expenseId = null,
  expenseMonthKey = null,
}) {
  const { state, addExpense, updateExpense, runWithLoader } = useAppState();
  const selectedMonthKey = expenseMonthKey || state.currentMonth;
  const month = state.data.months[selectedMonthKey];
  const expense = expenseId
    ? month.exp.find((item) => item.id === expenseId)
    : null;
  const [amount, setAmount] = useState(() =>
    expense ? expense.amt.toFixed(2) : "",
  );
  const [categoryId, setCategoryId] = useState(
    () => expense?.cat || preselectedCategoryId,
  );
  const [date, setDate] = useState(() =>
    expense ? expense.date : getDefaultDate(selectedMonthKey),
  );
  const [note, setNote] = useState(() => expense?.note || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const amountRef = useRef(null);
  const [year, monthNumber] = selectedMonthKey.split("-").map(Number);
  const minDate = `${selectedMonthKey}-01`;
  const maxDate = `${selectedMonthKey}-${padDatePart(
    daysInMonth(year, monthNumber),
  )}`;

  function handleAmountChange(event) {
    const nextAmount = event.target.value;
    if (isAllowedAmountInput(nextAmount)) setAmount(nextAmount);
  }

  useEffect(() => {
    if (expenseId) return undefined;
    const timeout = window.setTimeout(() => amountRef.current?.focus(), 350);
    return () => window.clearTimeout(timeout);
  }, [expenseId]);

  async function handleSubmit(event) {
    event.preventDefault();
    const parsedAmount = parseDollarAmount(amount);

    if (parsedAmount === null) {
      setError("Enter a number with up to two decimal places.");
      return;
    }
    if (parsedAmount === 0) {
      setError("Enter an amount other than $0.00.");
      return;
    }
    if (!categoryId) {
      setError("Choose a category.");
      return;
    }
    if (!date) {
      setError("Pick a date.");
      return;
    }
    if (date < minDate || date > maxDate) {
      setError("Pick a date within the displayed month.");
      return;
    }

    setError("");
    setSaving(true);
    try {
      const values = {
        categoryId,
        amount: parsedAmount,
        date,
        note,
      };
      await runWithLoader(async () => {
        if (expenseId) {
          await updateExpense({
            ...values,
            monthKey: selectedMonthKey,
            expenseId,
          });
        } else {
          await addExpense(values);
        }
      });
      onClose();
    } catch (submitError) {
      setError(
        submitError.message || "Could not save this expense. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (expenseId && !expense) {
    return (
      <div className="expense-form">
        <div className="sh-h">
          <span>Edit expense</span>
          <button className="link" type="button" onClick={onClose}>
            Done
          </button>
        </div>
        <div className="empty">This expense is no longer available.</div>
      </div>
    );
  }

  return (
    <form className="expense-form" onSubmit={handleSubmit}>
      <div className="sh-h">
        <button className="link" type="button" onClick={onClose}>
          Cancel
        </button>
        {expense ? "Edit expense" : "Add expense"}
        <span className="sheet-spacer" />
      </div>
      <input
        ref={amountRef}
        className="amt"
        inputMode="decimal"
        placeholder="$0.00"
        value={amount}
        onChange={handleAmountChange}
        aria-label="Amount"
      />
      <div className="chips" aria-label="Expense category">
        {month.cats.map((category) => (
          <button
            className={`chip${category.id === categoryId ? " sel" : ""}`}
            type="button"
            key={category.id}
            aria-pressed={category.id === categoryId}
            aria-label={formatCategoryName(category.name)}
            onClick={() => setCategoryId(category.id)}
          >
            <i>{category.emoji}</i>
            {formatCategoryName(category.name)}
          </button>
        ))}
      </div>
      <input
        className="f date-field"
        type="date"
        value={date}
        min={minDate}
        max={maxDate}
        onChange={(event) => setDate(event.target.value)}
        aria-label="Expense date"
        disabled={Boolean(expense)}
      />
      {expense && (
        <div className="expense-field-help">
          Date edits aren’t supported yet.
        </div>
      )}
      <input
        className="f"
        placeholder="Note (optional)"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        aria-label="Note (optional)"
      />
      <div className="err" role="alert">
        {error || state.storageError || ""}
      </div>
      <button className="save" type="submit" disabled={saving}>
        {expense ? "Save changes" : "Save expense"}
      </button>
    </form>
  );
}

export default ExpenseSheet;
