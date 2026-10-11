import { monthKey } from "../utils/date.js";

function ensureMonth(months, key) {
  if (months[key]) return months;

  const keys = Object.keys(months).sort();
  const previousKey = keys.filter((monthKey) => monthKey < key).pop();
  const sourceKey = previousKey || keys[0];
  const sourceMonth = months[sourceKey];

  return {
    ...months,
    [key]: {
      budget: sourceMonth.budget,
      cats: sourceMonth.cats.map((category) => ({ ...category })),
      exp: [],
    },
  };
}

export function createInitialState() {
  return {
    data: { theme: "", months: {} },
    currentMonth: monthKey(new Date()),
    storageStatus: "loading",
    storageError: null,
  };
}

export function appReducer(state, action) {
  switch (action.type) {
    case "data/load": {
      const currentMonth = monthKey(new Date());
      const months = ensureMonth(action.data.months, currentMonth);
      return {
        ...state,
        data: { ...action.data, months },
        currentMonth,
        storageStatus: "ready",
        storageError: null,
      };
    }
    case "data/refresh": {
      const months = ensureMonth(action.data.months, state.currentMonth);
      return {
        ...state,
        data: { ...action.data, months },
        storageStatus: "ready",
        storageError: null,
      };
    }
    case "data/replace":
      return {
        ...state,
        data: action.data,
        storageStatus: "ready",
        storageError: null,
      };
    case "data/reset":
      return {
        ...state,
        data: action.data,
        currentMonth: action.month,
        storageStatus: "ready",
        storageError: null,
      };
    case "storage/ready":
      return { ...state, storageStatus: "ready", storageError: null };
    case "storage/load-error":
      return {
        ...state,
        storageStatus: "load-error",
        storageError:
          action.message || "Could not load categories from the server.",
      };
    case "storage/save-error":
      return {
        ...state,
        storageStatus: "save-error",
        storageError: "Could not save expense changes.",
      };
    case "month/change": {
      const months = ensureMonth(state.data.months, action.month);
      return {
        ...state,
        data: months === state.data.months ? state.data : { ...state.data, months },
        currentMonth: action.month,
      };
    }
    default:
      return state;
  }
}
