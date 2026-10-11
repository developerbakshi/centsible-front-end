import { monthKey, padDatePart } from "../utils/date.js";

const DEFAULT_CATEGORIES = [
  ["Groceries", "🛒", 400],
  ["Dining Out", "🍽️", 250],
  ["Transport", "🚗", 200],
  ["Bills & Utilities", "💡", 900],
  ["Shopping", "🛍️", 300],
  ["Entertainment", "🎬", 150],
  ["Health", "💊", 150],
  ["Other", "📦", 150],
];

const DEFAULT_EXPENSES = [
  [0, 84.2, 1, "Trader Joe's"],
  [0, 61.3, 3, "Farmers market"],
  [0, 104.5, 4, "Costco run"],
  [1, 42.8, 2, "Taco night"],
  [1, 31.5, 4, "Coffee & brunch"],
  [2, 55, 2, "Gas"],
  [2, 18, 3, "Parking"],
  [3, 480, 1, "Rent share"],
  [3, 74.5, 2, "Electric"],
  [3, 65, 3, "Internet"],
  [4, 68.9, 3, "Sneakers"],
  [5, 15.99, 2, "Streaming"],
  [5, 28, 4, "Movie"],
  [6, 35, 3, "Pharmacy"],
  [7, 12, 4, "Postage"],
];

function createId() {
  return Math.random().toString(36).slice(2, 9);
}

export function createSeedData(date = new Date()) {
  const key = monthKey(date);
  const categories = DEFAULT_CATEGORIES.map(([name, emoji, limit], index) => ({
    id: `c${index}`,
    name,
    emoji,
    limit,
  }));
  const lastSeedDay = date.getDate();
  const dateForDay = (day) =>
    `${key}-${padDatePart(Math.min(day, lastSeedDay))}`;

  return {
    theme: "",
    months: {
      [key]: {
        budget: 3000,
        cats: categories,
        exp: DEFAULT_EXPENSES.map(([categoryIndex, amount, day, note]) => ({
          id: createId(),
          cat: categories[categoryIndex].id,
          amt: amount,
          date: dateForDay(day),
          note,
        })),
      },
    },
  };
}
