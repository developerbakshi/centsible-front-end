import { formatCategoryName } from "../../utils/category.js";
import { formatCurrency } from "../../utils/currency.js";
import { daysInMonth, monthKey as getMonthKey, padDatePart } from "../../utils/date.js";

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

function r2(value) {
  const rounded = Math.round(value * 100) / 100;
  return Math.abs(rounded) < 0.005 ? 0 : rounded;
}

export function getTone(ratio) {
  if (ratio >= 1) return "bad";
  if (ratio >= 0.8) return "warn";
  return "ok";
}

export function getWeeksOfMonth(key) {
  const [year, month] = key.split("-").map(Number);
  const totalDays = daysInMonth(year, month);
  const weeks = [];

  for (let day = 1; day <= totalDays; day += 1) {
    const weekday = new Date(year, month - 1, day).getDay();
    if (day === 1 || weekday === 1) {
      weeks.push({ startDay: day, endDay: day });
    }
    weeks[weeks.length - 1].endDay = day;
  }

  return weeks.map((week, index) => ({
    index,
    ...week,
    days: week.endDay - week.startDay + 1,
    start: `${key}-${padDatePart(week.startDay)}`,
    end: `${key}-${padDatePart(week.endDay)}`,
  }));
}

export function pickOpeningWeek({ monthKey, today = new Date() }) {
  const weeks = getWeeksOfMonth(monthKey);
  const currentMonth = getMonthKey(today);

  if (monthKey < currentMonth) return weeks.length - 1;
  if (monthKey > currentMonth) return 0;

  return (
    weeks.findIndex(
      ({ startDay, endDay }) =>
        startDay <= today.getDate() && today.getDate() <= endDay,
    ) || 0
  );
}

function getRelation(monthKey, week, today) {
  const currentMonth = getMonthKey(today);
  if (monthKey < currentMonth) return "past";
  if (monthKey > currentMonth) return "future";
  if (week.endDay < today.getDate()) return "past";
  if (week.startDay > today.getDate()) return "future";
  return "current";
}

function makeSubtitle(week, relation, currentWeekIndex, isCurrentMonth) {
  let label = `Week ${week.index + 1}`;

  if (isCurrentMonth && relation === "current") {
    label = "This week";
  } else if (
    isCurrentMonth &&
    relation === "future" &&
    week.index === currentWeekIndex + 1
  ) {
    label = "Next week";
  } else if (
    isCurrentMonth &&
    relation === "past" &&
    week.index === currentWeekIndex - 1
  ) {
    label = "Last week";
  }

  return week.days < 7
    ? `${label} · ${week.days} ${week.days === 1 ? "day" : "days"}`
    : label;
}

function makeWeekDate(day, year, month) {
  return new Date(year, month - 1, day);
}

export function calculateWeek({
  monthKey,
  month,
  weekIndex,
  today = new Date(),
}) {
  const [year, monthNumber] = monthKey.split("-").map(Number);
  const totalDays = daysInMonth(year, monthNumber);
  const weeks = getWeeksOfMonth(monthKey);
  const selectedIndex = Math.max(0, Math.min(weekIndex, weeks.length - 1));
  const week = weeks[selectedIndex];
  const currentMonth = getMonthKey(today);
  const isCurrentMonth = monthKey === currentMonth;
  const currentWeekIndex = isCurrentMonth ? pickOpeningWeek({ monthKey, today }) : -1;
  const currentWeek = isCurrentMonth ? weeks[currentWeekIndex] : null;
  const relation = getRelation(monthKey, week, today);
  const subtitle = makeSubtitle(week, relation, currentWeekIndex, isCurrentMonth);
  const categorySpent = new Map(month.cats.map(({ id }) => [id, 0]));
  const monthCategorySpent = new Map(month.cats.map(({ id }) => [id, 0]));
  const currentWeekCategorySpent = new Map(
    month.cats.map(({ id }) => [id, 0]),
  );
  const daySpent = new Map();
  let spent = 0;
  let monthSpent = 0;

  month.exp.forEach((expense) => {
    if (expense.date.slice(0, 7) !== monthKey) return;
    monthSpent += expense.amt;
    monthCategorySpent.set(
      expense.cat,
      (monthCategorySpent.get(expense.cat) || 0) + expense.amt,
    );
    if (
      currentWeek &&
      expense.date >= currentWeek.start &&
      expense.date <= currentWeek.end
    ) {
      currentWeekCategorySpent.set(
        expense.cat,
        (currentWeekCategorySpent.get(expense.cat) || 0) + expense.amt,
      );
    }
    if (expense.date < week.start || expense.date > week.end) return;

    spent += expense.amt;
    categorySpent.set(
      expense.cat,
      (categorySpent.get(expense.cat) || 0) + expense.amt,
    );
    daySpent.set(
      expense.date,
      (daySpent.get(expense.date) || 0) + expense.amt,
    );
  });

  spent = r2(spent);
  monthSpent = r2(monthSpent);
  categorySpent.forEach((amount, id) => categorySpent.set(id, r2(amount)));
  monthCategorySpent.forEach((amount, id) =>
    monthCategorySpent.set(id, r2(amount)),
  );
  currentWeekCategorySpent.forEach((amount, id) =>
    currentWeekCategorySpent.set(id, r2(amount)),
  );
  daySpent.forEach((amount, date) => daySpent.set(date, r2(amount)));

  let allowance;
  let categoryAllowance;
  if (relation === "future" && isCurrentMonth) {
    const monthLeftNow = month.budget - monthSpent;
    const daysAfterToday = totalDays - today.getDate();
    const dailyRate =
      monthLeftNow > 0 && daysAfterToday > 0
        ? monthLeftNow / daysAfterToday
        : 0;
    allowance = r2(dailyRate * week.days);
    categoryAllowance = (category) => {
      const categoryLeftNow = r2(
        category.limit - (monthCategorySpent.get(category.id) || 0),
      );
      const categorySpentThisWeek =
        currentWeekCategorySpent.get(category.id) || 0;
      const currentWeekStaticShare = r2(
        (category.limit * currentWeek.days) / totalDays,
      );
      const currentWeekRemainingAllowance = Math.min(
        currentWeekStaticShare,
        Math.max(0, r2(categoryLeftNow + categorySpentThisWeek)),
      );
      const currentWeekLeft = r2(
        currentWeekRemainingAllowance - categorySpentThisWeek,
      );
      const availableAfterCurrentWeek = Math.max(
        0,
        r2(categoryLeftNow - Math.max(0, currentWeekLeft)),
      );
      const daysAfterCurrentWeek = totalDays - currentWeek.endDay;

      return availableAfterCurrentWeek > 0 && daysAfterCurrentWeek > 0
        ? r2((availableAfterCurrentWeek * week.days) / daysAfterCurrentWeek)
        : 0;
    };
  } else {
    allowance = r2((month.budget * week.days) / totalDays);
    categoryAllowance = (category) => {
      const staticShare = r2((category.limit * week.days) / totalDays);
      if (relation !== "current" || !isCurrentMonth) return staticShare;

      const categoryLeftNow = r2(
        category.limit - (monthCategorySpent.get(category.id) || 0),
      );
      const currentWeekSpent = categorySpent.get(category.id) || 0;
      return Math.min(
        staticShare,
        Math.max(0, r2(categoryLeftNow + currentWeekSpent)),
      );
    };
  }

  const left = r2(allowance - spent);
  const ratio = allowance > 0 ? spent / allowance : spent > 0 ? Infinity : 0;
  const dailyLine = allowance / week.days;
  const days = Array.from({ length: week.days }, (_, offset) => {
    const day = week.startDay + offset;
    const date = `${monthKey}-${padDatePart(day)}`;
    const dateValue = makeWeekDate(day, year, monthNumber);
    const weekday = dateValue.getDay();
    const dateTotal = daySpent.get(date) || 0;
    return {
      date,
      letter: WEEKDAY_LETTERS[weekday],
      weekdayName: WEEKDAY_NAMES[weekday],
      total: dateTotal,
      isToday: date === `${getMonthKey(today)}-${padDatePart(today.getDate())}`,
      isFuture: dateValue > new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      ),
    };
  });
  const maxDayTotal = Math.max(...days.map(({ total }) => total), 0);
  const axisMax = Math.max(maxDayTotal, dailyLine, 1);
  const barHeights = days.map(({ total }) =>
    Math.max(3, (Math.max(0, total) / axisMax) * 90),
  );
  const categories = month.cats
    .map((category, index) => {
      const categoryAllowanceValue = categoryAllowance(category);
      const categorySpend = categorySpent.get(category.id) || 0;
      const categoryLeft = r2(categoryAllowanceValue - categorySpend);
      const categoryRatio =
        categoryAllowanceValue > 0
          ? categorySpend / categoryAllowanceValue
          : categorySpend > 0
            ? Infinity
            : 0;
      return {
        category,
        name: formatCategoryName(category.name),
        allowance: categoryAllowanceValue,
        spent: categorySpend,
        left: categoryLeft,
        ratio: categoryRatio,
        tone: getTone(categoryRatio),
        originalIndex: index,
      };
    })
    .sort(
      (first, second) =>
        second.ratio - first.ratio || first.originalIndex - second.originalIndex,
    );

  return {
    weeks,
    week,
    relation,
    subtitle,
    allowance,
    spent,
    left,
    ratio,
    tone: getTone(ratio),
    dailyLine,
    days,
    axis: {
      barHeights,
      lineBottom: (dailyLine / axisMax) * 90,
    },
    categories,
    canGoPrev: selectedIndex > 0,
    canGoNext: selectedIndex < weeks.length - 1,
  };
}

export function formatWeekDockValue(left) {
  const rounded = Math.round(left);
  const normalized = Object.is(rounded, -0) ? 0 : rounded;
  return normalized < 0
    ? `−${formatCurrency(Math.abs(normalized))}`
    : formatCurrency(normalized);
}
