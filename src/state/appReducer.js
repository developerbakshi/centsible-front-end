import { createSeedData } from "../constants/defaultData.js";
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
  const data = createSeedData();

  return {
    data,
    currentMonth: Object.keys(data.months)[0],
    themeError: null,
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
        data: { ...action.data, theme: state.data.theme, months },
        currentMonth,
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
        themeError: null,
      };
    case "storage/ready":
      return { ...state, storageStatus: "ready", storageError: null };
    case "storage/load-error":
      return {
        ...state,
        storageStatus: "load-error",
        storageError: "Could not load saved expenses from this device.",
      };
    case "storage/save-error":
      return {
        ...state,
        storageStatus: "save-error",
        storageError: "Could not save expenses to this device.",
      };
    case "month/change": {
      const months = ensureMonth(state.data.months, action.month);
      return {
        data: months === state.data.months ? state.data : { ...state.data, months },
        currentMonth: action.month,
      };
    }
    case "theme/load":
    case "theme/change":
      return {
        ...state,
        data: { ...state.data, theme: action.theme },
        themeError: null,
      };
    case "theme/error":
      return { ...state, themeError: action.message };
    default:
      return state;
  }
}
