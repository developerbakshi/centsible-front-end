import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { appReducer, createInitialState } from "./appReducer.js";
import {
  loadAppData,
  saveAppData,
} from "../services/storage/appDataService.js";
import {
  addExpense as addExpenseService,
  deleteExpense as deleteExpenseService,
  updateExpense as updateExpenseService,
} from "../features/expenses/expenseService.js";
import {
  clearThemePreference,
  loadThemePreference,
  saveThemePreference,
} from "../services/storage/preferencesService.js";
import {
  resetSampleData as resetSampleDataService,
  updateMonthSettings as updateMonthSettingsService,
} from "../features/settings/settingsService.js";
import { monthKey } from "../utils/date.js";

const AppContext = createContext(null);

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, undefined, createInitialState);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const settingsDataRef = useRef(state.data);
  const settingsQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    settingsDataRef.current = state.data;
  }, [state.data]);

  useEffect(() => {
    let active = true;

    async function initializeData() {
      try {
        const savedData = await loadAppData();
        if (!active) return;

        if (savedData) {
          dispatch({ type: "data/load", data: savedData });
        } else {
          await saveAppData(state.data);
          if (active) dispatch({ type: "storage/ready" });
        }
      } catch {
        if (active) dispatch({ type: "storage/load-error" });
      }
    }

    initializeData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    loadThemePreference()
      .then((theme) => {
        if (active) dispatch({ type: "theme/load", theme });
      })
      .catch(() => {
        if (active) {
          dispatch({
            type: "theme/error",
            message: "Could not load the saved theme preference.",
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = (event) =>
      setSystemTheme(event.matches ? "dark" : "light");

    setSystemTheme(media.matches ? "dark" : "light");
    media.addEventListener("change", updateSystemTheme);

    return () => media.removeEventListener("change", updateSystemTheme);
  }, []);

  const setTheme = useCallback(
    async (theme) => {
      dispatch({ type: "theme/change", theme });
      try {
        await saveThemePreference(theme);
      } catch {
        dispatch({
          type: "theme/error",
          message: "Could not save the theme preference.",
        });
      }
    },
    [dispatch],
  );
  const runExpenseOperation = useCallback(
    async (operation, payload) => {
      if (state.storageStatus === "load-error") {
        throw new Error("Saved expenses could not be loaded.");
      }

      try {
        const data = await operation(state.data, payload);
        dispatch({ type: "data/replace", data });
      } catch (error) {
        dispatch({ type: "storage/save-error" });
        throw error;
      }
    },
    [dispatch, state.data, state.storageStatus],
  );
  const addExpense = useCallback(
    (expense) => runExpenseOperation(addExpenseService, expense),
    [runExpenseOperation],
  );
  const updateExpense = useCallback(
    (expense) => runExpenseOperation(updateExpenseService, expense),
    [runExpenseOperation],
  );
  const deleteExpense = useCallback(
    (expense) => runExpenseOperation(deleteExpenseService, expense),
    [runExpenseOperation],
  );
  const runSettingsOperation = useCallback(
    (operation, payload, reset = false) => {
      const execute = async () => {
        if (state.storageStatus === "load-error") {
          throw new Error("Saved expenses could not be loaded.");
        }

        try {
          const data = await operation(settingsDataRef.current, payload);
          settingsDataRef.current = data;
          dispatch(
            reset
              ? { type: "data/reset", data, month: monthKey(new Date()) }
              : { type: "data/replace", data },
          );
          return data;
        } catch (error) {
          dispatch({ type: "storage/save-error" });
          throw error;
        }
      };
      const pending = settingsQueueRef.current.then(execute, execute);
      settingsQueueRef.current = pending.catch(() => {});
      return pending;
    },
    [state.storageStatus],
  );
  const updateMonthSettings = useCallback(
    (change) =>
      runSettingsOperation(updateMonthSettingsService, {
        monthKey: state.currentMonth,
        change,
      }),
    [runSettingsOperation, state.currentMonth],
  );
  const resetSampleData = useCallback(async () => {
    const data = await runSettingsOperation(resetSampleDataService, null, true);
    try {
      await clearThemePreference();
    } catch {
      dispatch({
        type: "theme/error",
        message: "Sample data was reset, but the theme preference could not be reset.",
      });
    }
    return data;
  }, [dispatch, runSettingsOperation]);
  const value = useMemo(
    () => ({
      state,
      dispatch,
      effectiveTheme: state.data.theme || systemTheme,
      setTheme,
      addExpense,
      updateExpense,
      deleteExpense,
      updateMonthSettings,
      resetSampleData,
    }),
    [
      state,
      systemTheme,
      setTheme,
      addExpense,
      updateExpense,
      deleteExpense,
      updateMonthSettings,
      resetSampleData,
    ],
  );

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppState must be used inside AppProvider.");
  }
  return context;
}
