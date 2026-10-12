import React, { useEffect, useMemo, useRef, useState } from "react";
import { formatCurrency, formatCurrencyWithCents } from "../../utils/currency.js";
import { useAppState } from "../../state/AppContext.jsx";
import { calculateWeek, getWeeksOfMonth, pickOpeningWeek } from "./weekCalculations.js";
import "./week.css";

function WeekDayRail({ weekIndex, days, axis }) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const firstFrame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setAnimated(true));
    });
    return () => cancelAnimationFrame(firstFrame);
  }, []);

  const summary = days
    .map(({ weekdayName, total }) => `${weekdayName} ${formatCurrency(total)}`)
    .join(", ");

  return (
    <div
      className="week-rail"
      role="img"
      aria-label={`Spending by day: ${summary}`}
    >
      <div className="week-rail-bars" key={weekIndex}>
        <span
          className="week-daily-line"
          style={{ bottom: `${axis.lineBottom}px` }}
          aria-hidden="true"
        />
        {days.map((day, index) => {
          let toneClass = "week-day-bar-accent";
          if (day.total === 0) {
            toneClass = day.isFuture
              ? "week-day-bar-future"
              : "week-day-bar-past";
          } else if (day.total > axis.dailyLine) {
            toneClass = "week-day-bar-warn";
          }
          return (
            <div className="week-day-column" key={day.date}>
              <div className="week-day-bar-area">
                <span
                  className={`week-day-bar ${toneClass}`}
                  style={{
                    height: animated ? `${axis.barHeights[index]}px` : "3px",
                  }}
                />
              </div>
              <span
                className={`week-day-letter${day.isToday ? " is-today" : ""}`}
              >
                {day.letter}
              </span>
            </div>
          );
        })}
        <span
          className="week-daily-line-label"
          style={{ bottom: `${axis.lineBottom + 3}px` }}
          aria-hidden="true"
        >
          {formatCurrency(Math.round(axis.dailyLine))}/day
        </span>
      </div>
    </div>
  );
}

function WeekCategoryRow({ item, weekIndex }) {
  const [animated, setAnimated] = useState(false);
  const width = `${Math.min(Math.max(item.ratio, 0), 1) * 100}%`;
  const statusTone =
    item.left < 0 ? "week-status-bad" : `week-status-${item.tone}`;
  const statusText =
    item.left < 0
      ? `Over ${formatCurrency(Math.abs(item.left))}`
      : `${formatCurrency(item.left)} left`;

  useEffect(() => {
    const firstFrame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setAnimated(true));
    });
    return () => cancelAnimationFrame(firstFrame);
  }, []);

  return (
    <div className="week-category-row" data-week={weekIndex}>
      <div className="week-category-heading">
        <span className="week-category-identity">
          {item.category.emoji && (
            <span className="week-category-emoji" aria-hidden="true">
              {item.category.emoji}
            </span>
          )}
          <span className="week-category-name">{item.name}</span>
        </span>
        <span className={statusTone}>{statusText}</span>
      </div>
      <div className="week-category-track" aria-hidden="true">
        <span
          className={`week-category-fill week-fill-${item.tone}`}
          style={{ width: animated ? width : "0%" }}
        />
      </div>
    </div>
  );
}

function formatWeekRange(week, monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const start = new Date(year, month - 1, week.startDay);
  if (week.startDay === week.endDay) {
    return start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
  return `${start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} – ${week.endDay}`;
}

function WeekSheet({ onClose }) {
  const { state } = useAppState();
  const monthKey = state.currentMonth;
  const month = state.data.months[monthKey];
  const weeks = useMemo(() => getWeeksOfMonth(monthKey), [monthKey]);
  const [weekIndex, setWeekIndex] = useState(() =>
    pickOpeningWeek({ monthKey }),
  );
  const previousMonthRef = useRef(monthKey);

  useEffect(() => {
    if (previousMonthRef.current !== monthKey) {
      previousMonthRef.current = monthKey;
      setWeekIndex(pickOpeningWeek({ monthKey }));
      return;
    }
    setWeekIndex((current) => Math.min(current, weeks.length - 1));
  }, [monthKey, weeks.length]);

  const week = useMemo(
    () => calculateWeek({ monthKey, month, weekIndex }),
    [monthKey, month, weekIndex],
  );
  const [wholeDollars, cents] = formatCurrencyWithCents(
    Math.abs(week.left),
  )
    .slice(1)
    .split(".");

  return (
    <div className="week-sheet-content">
      <header className="week-header">
        <div className="week-header-nav">
          <button
            className="week-arrow"
            type="button"
            aria-label="Previous week"
            disabled={!week.canGoPrev}
            onClick={() => setWeekIndex((current) => Math.max(0, current - 1))}
          >
            ‹
          </button>
          <div className="week-title">
            <span className="week-date-range">
              {formatWeekRange(week.week, monthKey)}
            </span>
            <span className="week-subtitle">{week.subtitle}</span>
          </div>
          <button
            className="week-arrow"
            type="button"
            aria-label="Next week"
            disabled={!week.canGoNext}
            onClick={() =>
              setWeekIndex((current) => Math.min(weeks.length - 1, current + 1))
            }
          >
            ›
          </button>
        </div>
        <button
          className="week-done"
          type="button"
          onClick={onClose}
        >
          Done
        </button>
      </header>

      <section className="week-hero" aria-label="Weekly budget">
        <div className="week-hero-left">
          <div className="week-hero-label">
            {week.left < 0 ? "Over this week by" : "Left this week"}
          </div>
          <div className={`week-hero-amount tone-${week.tone}`}>
            <span>${wholeDollars}</span>
            <span className="week-hero-cents">.{cents}</span>
          </div>
        </div>
        <div className="week-hero-caption">
          of {formatCurrency(Math.round(week.allowance))} ·{" "}
          {formatCurrency(Math.round(week.dailyLine))} a day
        </div>
      </section>

      <WeekDayRail
        key={weekIndex}
        weekIndex={weekIndex}
        days={week.days}
        axis={{ ...week.axis, dailyLine: week.dailyLine }}
      />

      <section className="week-categories" aria-label="Weekly category budgets">
        <h2 className="week-categories-title">Categories</h2>
        <div>
          {week.categories.map((item) => (
            <WeekCategoryRow
              key={`${weekIndex}-${item.category.id}`}
              item={item}
              weekIndex={weekIndex}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export default WeekSheet;
