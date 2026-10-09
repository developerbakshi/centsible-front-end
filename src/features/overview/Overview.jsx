import React, { useEffect, useMemo, useState } from "react";
import { useAppState } from "../../state/AppContext.jsx";
import { formatCurrency, formatCurrencyWithCents } from "../../utils/currency.js";
import { formatCategoryName } from "../../utils/category.js";
import {
  daysInMonth,
  getDaysLeft,
  monthKey,
  shiftMonth,
} from "../../utils/date.js";
import "./overview.css";

function getTone(ratio) {
  if (ratio >= 1) return "bad";
  if (ratio >= 0.8) return "warn";
  return "ok";
}

function calculateOverview(monthKeyValue, month, today = new Date()) {
  const [year, monthNumber] = monthKeyValue.split("-").map(Number);
  const totalDays = daysInMonth(year, monthNumber);
  const todayMonth = monthKey(today);
  const daysElapsed =
    monthKeyValue < todayMonth
      ? totalDays
      : monthKeyValue > todayMonth
        ? 0
        : today.getDate();
  const daysLeft = getDaysLeft(monthKeyValue, today);
  const spentByCategory = {};
  const dailyAmounts = Array(totalDays).fill(0);

  month.exp.forEach((expense) => {
    spentByCategory[expense.cat] =
      (spentByCategory[expense.cat] || 0) + expense.amt;
    const day = Number(expense.date.slice(8, 10)) - 1;
    if (day >= 0 && day < dailyAmounts.length) {
      dailyAmounts[day] += expense.amt;
    }
  });

  const spent = Object.values(spentByCategory).reduce(
    (total, amount) => total + amount,
    0,
  );
  const left = month.budget - spent;
  const overBudget = left < 0;
  const budgetRatio = month.budget ? spent / month.budget : 0;
  const heroTone = overBudget
    ? "bad"
    : 1 - budgetRatio < 0.2
      ? "warn"
      : "ok";
  const pace = daysElapsed && daysElapsed < totalDays
    ? daysElapsed / totalDays
    : null;
  const paceDifference =
    pace === null ? 0 : spent - Math.round(month.budget * pace * 100) / 100;
  const perDay = daysLeft && !overBudget ? Math.round((left / daysLeft) * 100) / 100 : 0;
  const maxDailyAmount = Math.max(...dailyAmounts, 1);

  let status;
  if (overBudget) {
    status = "Over budget — time to ease off";
  } else if (pace === null) {
    status = daysLeft ? "Month hasn't started" : "Month closed";
  } else if (paceDifference > 0) {
    status = `${formatCurrency(paceDifference)} ahead of an even pace`;
  } else {
    status = `${formatCurrency(-paceDifference)} under an even pace`;
  }

  const statusTone =
    overBudget || (paceDifference > 0 && heroTone !== "ok")
      ? heroTone
      : paceDifference > 0
        ? "warn"
        : "ok";
  const categories = month.cats
    .map((category) => ({
      category,
      spent: spentByCategory[category.id] || 0,
    }))
    .sort(
      (first, second) =>
        second.spent / (second.category.limit || 1) -
        first.spent / (first.category.limit || 1),
    );

  return {
    totalDays,
    daysElapsed,
    daysLeft,
    spent,
    left,
    overBudget,
    heroTone,
    pace,
    paceDifference,
    perDay,
    maxDailyAmount,
    dailyAmounts,
    status,
    statusTone,
    categories,
  };
}

function ProgressBar({ ratio, tone, tick, marker }) {
  const [animated, setAnimated] = useState(false);
  const width = `${Math.max(0, Math.min(ratio, 1)) * 100}%`;

  useEffect(() => {
    const first = requestAnimationFrame(() => {
      requestAnimationFrame(() => setAnimated(true));
    });
    return () => cancelAnimationFrame(first);
  }, []);

  return (
    <div className="bar">
      <div
        className={`fill f-${tone}`}
        style={{ width: animated ? width : "0%" }}
      />
      {tick !== null && (
        <span className="tick" style={{ left: `${tick * 100}%` }} />
      )}
      {marker && (
        <span
          className="thumb"
          style={{
            left: animated
              ? `clamp(0px, calc(${width} - 14px), calc(100% - 24px))`
              : "0px",
          }}
        >
          {marker}
        </span>
      )}
    </div>
  );
}

function DailySpendingRibbon({ amounts, maxAmount, daysElapsed }) {
  return (
    <>
      <div className="ribbon" aria-label="Daily spending">
        {amounts.map((dailyAmount, index) => {
          const day = index + 1;
          const amount = Math.max(0, dailyAmount);
          const className =
            day > daysElapsed
              ? "fut"
              : amount
                ? day === daysElapsed
                  ? "now"
                  : ""
                : "z";
          const height = amount
            ? `${Math.max(12, (amount / maxAmount) * 100)}%`
            : "10%";

          return <i className={className} style={{ height }} key={day} />;
        })}
      </div>
      <div className="rcap">
        <span>1</span>
        <span>spending by day</span>
        <span>{amounts.length}</span>
      </div>
    </>
  );
}

function MonthlyHero({ month, overview, animationKey }) {
  const absoluteLeft = Math.round(Math.abs(overview.left) * 100) / 100;
  const [wholeDollars, cents = "00"] = formatCurrencyWithCents(
    absoluteLeft,
  )
    .slice(1)
    .split(".");

  return (
    <section className="hero">
      <div className="lbl">
        {overview.overBudget ? "Over budget by" : "Left this month"}
      </div>
      <div className={`big ${overview.heroTone}`}>
        <span className="cur">$</span>
        {wholeDollars}
        <span className="cents">.{cents}</span>
      </div>
      <div className={`status ${overview.statusTone}`}>{overview.status}</div>
      <ProgressBar
        key={animationKey}
        ratio={overview.spent / (month.budget || 1)}
        tone={overview.heroTone}
        tick={overview.pace}
      />
      <DailySpendingRibbon
        amounts={overview.dailyAmounts}
        maxAmount={overview.maxDailyAmount}
        daysElapsed={overview.daysElapsed}
      />
      <div className="trio">
        <div>
          Spent
          <b>{formatCurrency(Math.round(overview.spent))}</b>
        </div>
        <div>
          Budget
          <b>{formatCurrency(month.budget)}</b>
        </div>
        <div>
          {overview.daysLeft} day{overview.daysLeft === 1 ? "" : "s"} left
          <b>
            {overview.daysLeft && !overview.overBudget
              ? `~${formatCurrency(overview.perDay)}/day`
              : "—"}
          </b>
        </div>
      </div>
    </section>
  );
}

function CategoryRow({ category, spent, pace, animationKey, onSelect }) {
  const ratio = spent / (category.limit || 1);
  const left = category.limit - spent;
  const tone = getTone(ratio);

  return (
    <button
      className="cat"
      type="button"
      onClick={() => onSelect(category.id)}
    >
      <div className="top">
        <span className="nm">{formatCategoryName(category.name)}</span>
        <span className="of">of {formatCurrency(category.limit)}</span>
      </div>
      <ProgressBar
        key={animationKey}
        ratio={ratio}
        tone={tone}
        tick={pace}
        marker={category.emoji}
      />
      <div className="sl">
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
    </button>
  );
}

function Overview({ onSelectCategory, onOpenSettings }) {
  const { state, dispatch, effectiveTheme, setTheme } = useAppState();
  const month = state.data.months[state.currentMonth];
  const overview = useMemo(
    () => calculateOverview(state.currentMonth, month),
    [state.currentMonth, month],
  );

  function changeMonth(amount) {
    dispatch({
      type: "month/change",
      month: shiftMonth(state.currentMonth, amount),
    });
  }

  function toggleTheme() {
    setTheme(effectiveTheme === "dark" ? "light" : "dark");
  }

  const [selectedYear, selectedMonth] = state.currentMonth.split("-").map(Number);
  const selectedMonthName = new Date(
    selectedYear,
    selectedMonth - 1,
    1,
  ).toLocaleDateString("en-US", { month: "long" });

  return (
    <>
      <header className="overview-header">
        <div className="overview-header-top">
          <div className="word">
            <b>Cent</b>sible
          </div>
          <div className="header-actions">
            <button
              className="theme-toggle"
              type="button"
              role="switch"
              aria-label="Dark theme"
              aria-checked={effectiveTheme === "dark"}
              onClick={toggleTheme}
            >
              <span className="theme-track" aria-hidden="true">
                <span className="theme-icon">☀️</span>
                <span className="theme-icon">🌙</span>
                <span className="theme-thumb" />
              </span>
            </button>
            <button
              className="settings-button"
              type="button"
              aria-label="Budget settings"
              onClick={onOpenSettings}
            >
              ⚙︎
            </button>
          </div>
        </div>
        <div className="month">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => changeMonth(-1)}
          >
            <span aria-hidden="true">‹</span>
          </button>
          <div className="month-label">
            <span>{selectedMonthName}</span>
            <span>{selectedYear}</span>
          </div>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => changeMonth(1)}
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>
      </header>
      {state.themeError && (
        <div className="theme-error" role="alert">
          {state.themeError}
        </div>
      )}
      {state.storageError && (
        <div className="theme-error" role="alert">
          {state.storageError}
        </div>
      )}
      <MonthlyHero
        month={month}
        overview={overview}
        animationKey={state.currentMonth}
      />
      <div className="sect">Categories · most used first</div>
      <div className="category-list">
        {overview.categories.map(({ category, spent }) => (
          <CategoryRow
            key={category.id}
            category={category}
            spent={spent}
            pace={overview.pace}
            animationKey={state.currentMonth}
            onSelect={onSelectCategory}
          />
        ))}
      </div>
    </>
  );
}

export default Overview;
