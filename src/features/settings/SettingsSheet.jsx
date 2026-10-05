import React, { useState } from "react";
import { useAppState } from "../../state/AppContext.jsx";
import { formatCategoryName } from "../../utils/category.js";
import { formatCurrency } from "../../utils/currency.js";
import { formatMonthLabel } from "../../utils/date.js";
import "./settings.css";

function parseSettingsAmount(value) {
  const amount = Number.parseFloat(value);
  return Number.isFinite(amount) && amount >= 0
    ? Math.round(amount * 100) / 100
    : null;
}

function SettingsSheet({ onClose }) {
  const { state, updateMonthSettings, resetSampleData } = useAppState();
  const month = state.data.months[state.currentMonth];
  const [budgetValue, setBudgetValue] = useState(month.budget.toFixed(2));
  const [categories, setCategories] = useState(() =>
    month.cats.map((category) => ({
      ...category,
      limitValue: String(category.limit),
    })),
  );
  const [error, setError] = useState("");

  function reportFailure(message) {
    setError(message);
  }

  async function persistChange(change) {
    setError("");
    try {
      return await updateMonthSettings(change);
    } catch {
      reportFailure("Could not save these settings. Please try again.");
      return null;
    }
  }

  function handleBudgetChange(event) {
    const value = event.target.value;
    setBudgetValue(value);
    const amount = parseSettingsAmount(value);
    if (amount !== null) {
      persistChange({ type: "budget", value: amount });
    }
  }

  function handleCategoryChange(categoryId, field, value) {
    setCategories((current) =>
      current.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              [field === "limit" ? "limitValue" : field]: value,
            }
          : category,
      ),
    );

    const parsedValue =
      field === "limit" ? parseSettingsAmount(value) : value;
    if (parsedValue !== null) {
      persistChange({
        type: "category/update",
        categoryId,
        field,
        value: parsedValue,
      });
    }
  }

  async function handleAddCategory() {
    const data = await persistChange({ type: "category/add" });
    if (data) {
      setCategories(
        data.months[state.currentMonth].cats.map((category) => ({
          ...category,
          limitValue: String(category.limit),
        })),
      );
    }
  }

  async function handleDeleteCategory(categoryId) {
    if (month.cats.length < 2) return;
    const expenseCount = month.exp.filter(
      (expense) => expense.cat === categoryId,
    ).length;
    if (
      expenseCount &&
      !window.confirm(
        `Delete this category and its ${expenseCount} expense${expenseCount > 1 ? "s" : ""} this month?`,
      )
    ) {
      return;
    }

    const data = await persistChange({ type: "category/delete", categoryId });
    if (data) {
      setCategories(
        data.months[state.currentMonth].cats.map((category) => ({
          ...category,
          limitValue: String(category.limit),
        })),
      );
    }
  }

  async function handleReset() {
    if (!window.confirm("Replace all data with sample data?")) return;
    setError("");
    try {
      await resetSampleData();
      onClose();
    } catch {
      setError("Could not reset sample data. Please try again.");
    }
  }

  const categoryLimitTotal = month.cats.reduce(
    (total, category) => total + category.limit,
    0,
  );
  const difference = month.budget - categoryLimitTotal;
  const sortedCategories = [...categories].sort(
    (first, second) =>
      (Number.parseFloat(second.limitValue) || 0) -
      (Number.parseFloat(first.limitValue) || 0),
  );

  return (
    <div className="settings-sheet">
      <div className="sh-h">
        <span>Budget · {formatMonthLabel(state.currentMonth)}</span>
        <button className="link" type="button" onClick={onClose}>
          Done
        </button>
      </div>
      <div className="card">
        <div className="row2">Total monthly budget</div>
        <input
          className="f"
          inputMode="decimal"
          aria-label="Total monthly budget"
          value={budgetValue}
          onChange={handleBudgetChange}
          style={{ marginTop: 6 }}
        />
      </div>
      <div
        className={difference ? "warnbox" : "row2 settings-total"}
        role={difference ? "status" : undefined}
      >
        Category limits total {formatCurrency(categoryLimitTotal)} of{" "}
        {formatCurrency(month.budget)}
        {difference
          ? ` — ${difference > 0 ? `${formatCurrency(difference)} unassigned` : `${formatCurrency(-difference)} over the total`}.`
          : " ✓"}
      </div>
      <div className="card settings-categories">
        <div className="settings-rows">
          {sortedCategories.map((category) => (
            <div className="srow" data-id={category.id} key={category.id}>
              <input
                className="f"
                aria-label={`${formatCategoryName(category.name || "Category")} emoji`}
                value={category.emoji}
                onChange={(event) =>
                  handleCategoryChange(category.id, "emoji", event.target.value)
                }
              />
              <input
                className="f settings-category-name"
                aria-label={`${formatCategoryName(category.name || "Category")} name`}
                value={category.name}
                onChange={(event) =>
                  handleCategoryChange(category.id, "name", event.target.value)
                }
              />
              <input
                className="f"
                inputMode="decimal"
                aria-label={`${formatCategoryName(category.name || "Category")} limit`}
                value={category.limitValue}
                onChange={(event) =>
                  handleCategoryChange(category.id, "limit", event.target.value)
                }
              />
              <button
                type="button"
                aria-label={`Delete ${formatCategoryName(category.name || "category")} (temporarily unavailable)`}
                title="Category deletion is temporarily unavailable"
                disabled
                onClick={() => handleDeleteCategory(category.id)}
              >
                🗑
              </button>
            </div>
          ))}
        </div>
        <div className="settings-category-help">
          Adding and deleting categories are temporarily unavailable.
        </div>
        <button
          className="link settings-add-category"
          type="button"
          title="Adding categories is temporarily unavailable"
          disabled
          onClick={handleAddCategory}
        >
          + Add category
        </button>
      </div>
      {error && (
        <div className="err settings-error" role="alert">
          {error}
        </div>
      )}
      <button
        className="link settings-reset"
        type="button"
        onClick={handleReset}
      >
        Reset sample data
      </button>
    </div>
  );
}

export default SettingsSheet;
