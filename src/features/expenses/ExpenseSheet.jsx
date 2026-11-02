import React, { useEffect, useRef, useState } from "react";
import { useAppState } from "../../state/AppContext.jsx";
import { formatCategoryName } from "../../utils/category.js";
import { parseDollarAmount } from "../../utils/currency.js";
import { daysInMonth, padDatePart } from "../../utils/date.js";
import "./expenses.css";

function getExpenseParties(expense) {
  const [noteMerchant = "", ...bankParts] = (expense?.note || "").split(" · ");
  return {
    merchant: expense?.merchant ?? noteMerchant,
    bank: expense?.bank ?? bankParts.join(" · "),
  };
}

function isAllowedAmountInput(value) {
  return /^-?(?:\d+(?:\.\d{0,2})?|\.\d{0,2})?$/.test(value);
}

function ExpenseSheet({
  onClose,
  onRequestDelete,
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
  const expenseParties = getExpenseParties(expense);
  const [amount, setAmount] = useState(() =>
    expense ? expense.amt.toFixed(2) : "",
  );
  const [categoryId, setCategoryId] = useState(
    () => expense?.cat || preselectedCategoryId,
  );
  const [date, setDate] = useState(() =>
    expense ? expense.date : "",
  );
  const [merchant, setMerchant] = useState(expenseParties.merchant);
  const [bank, setBank] = useState(expenseParties.bank);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [createdButUnconfirmed, setCreatedButUnconfirmed] = useState(false);
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

  function toggleCredit() {
    setAmount((current) =>
      current.startsWith("-") ? current.slice(1) : `-${current}`,
    );
    amountRef.current?.focus();
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
    if (expenseId) {
      if (!date) {
        setError("Pick a date.");
        return;
      }
      if (date < minDate || date > maxDate) {
        setError("Pick a date within the displayed month.");
        return;
      }
    }

    setError("");
    setSaving(true);
    try {
      const values = {
        categoryId,
        amount: parsedAmount,
        merchant: merchant.trim(),
        bank: bank.trim(),
      };
      await runWithLoader(async () => {
        if (expenseId) {
          await updateExpense({
            ...values,
            date,
            monthKey: selectedMonthKey,
            expenseId,
          });
        } else {
          await addExpense(values);
        }
      });
      onClose();
    } catch (submitError) {
      if (submitError.expenseCreated) setCreatedButUnconfirmed(true);
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
        <button className="link" type="submit" disabled={saving || createdButUnconfirmed}>
          {createdButUnconfirmed ? "Submitted" : "Save"}
        </button>
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
      <div className="expense-fields">
        <div className="expense-row">
          <label htmlFor="expense-date">Date</label>
          {expense ? (
            <input
              id="expense-date"
              className="expense-date-control"
              type="date"
              value={date}
              min={minDate}
              max={maxDate}
              onChange={(event) => setDate(event.target.value)}
              aria-label="Expense date"
              disabled
            />
          ) : (
            <span
              id="expense-date"
              className="expense-date-control expense-date-assigned"
            >
              Assigned when saved
            </span>
          )}
        </div>
        <div className="expense-row">
          <label htmlFor="expense-merchant">Merchant</label>
          <input
            id="expense-merchant"
            placeholder="Optional"
            autoComplete="off"
            value={merchant}
            onChange={(event) => setMerchant(event.target.value)}
            aria-label="Merchant (optional)"
          />
        </div>
        <div className="expense-row">
          <label htmlFor="expense-bank">Bank</label>
          <input
            id="expense-bank"
            placeholder="Optional"
            autoComplete="off"
            value={bank}
            onChange={(event) => setBank(event.target.value)}
            aria-label="Bank (optional)"
          />
        </div>
        <div className="expense-row">
          <label htmlFor="expense-credit">Credit</label>
          <button
            id="expense-credit"
            className="expense-credit-switch"
            type="button"
            role="switch"
            aria-checked={amount.startsWith("-")}
            onClick={toggleCredit}
          />
        </div>
      </div>
      <div className="expense-field-help">
        {expense
          ? "Date edits aren’t supported yet."
          : "The API assigns the expense date when it is saved."}
      </div>
      {expense && (
        <button
          className="expense-delete-cta"
          type="button"
          onClick={() => onRequestDelete(expense, selectedMonthKey)}
        >
          Delete expense
        </button>
      )}
      <div className="err" role="alert">
        {error || (!createdButUnconfirmed ? state.storageError : "") || ""}
      </div>
    </form>
  );
}

export default ExpenseSheet;
