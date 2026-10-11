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
import { saveAppData } from "../services/storage/appDataService.js";
import { getCategories } from "../services/categories/categoryService.js";
import { getExpenses } from "../services/expenses/expenseService.js";
import {
  addExpense as addExpenseService,
  deleteExpense as deleteExpenseService,
  updateExpense as updateExpenseService,
} from "../features/expenses/expenseService.js";
import {
  resetSampleData as resetSampleDataService,
  updateMonthSettings as updateMonthSettingsService,
} from "../features/settings/settingsService.js";
import { monthKey } from "../utils/date.js";

const AppContext = createContext(null);

async function fetchLatestData() {
  const [categories, expenses] = await Promise.all([
    getCategories(),
    getExpenses(),
  ]);
  const key = monthKey(new Date());
  const budget = categories.reduce(
    (total, category) => total + category.limit,
    0,
  );
  const months = {
    [key]: { budget, cats: categories, exp: [] },
  };
  expenses.forEach((expense) => {
    if (!categories.some(({ id }) => id === expense.categoryId)) {
      throw new Error(`Expense ${expense.id} references an unknown category.`);
    }

    const expenseMonth = expense.date.slice(0, 7);
    if (!months[expenseMonth]) {
      months[expenseMonth] = { budget, cats: categories, exp: [] };
    }
    months[expenseMonth].exp.push({
      id: expense.id,
      cat: expense.categoryId,
      amt: expense.amount,
      date: expense.date,
      time: expense.time,
      createdAt: expense.createdAt,
      merchant: expense.merchant,
      bank: expense.bank,
      note: expense.note,
    });
  });
  return { theme: "", months };
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, undefined, createInitialState);
  const [refreshStatus, setRefreshStatus] = useState({
    isRefreshing: false,
    error: null,
  });
  const [isOperationLoading, setIsOperationLoading] = useState(false);
  const operationCountRef = useRef(0);
  const settingsDataRef = useRef(state.data);
  const settingsQueueRef = useRef(Promise.resolve());
  const refreshPromiseRef = useRef(null);

  useEffect(() => {
    settingsDataRef.current = state.data;
  }, [state.data]);

  useEffect(() => {
    let active = true;

    async function initializeData() {
      try {
        const data = await fetchLatestData();
        if (!active) return;

        await saveAppData(data);
        if (active) dispatch({ type: "data/load", data });
      } catch (error) {
        if (active) {
          dispatch({
            type: "storage/load-error",
            message: error.message,
          });
        }
      }
    }

    initializeData();

    return () => {
      active = false;
    };
  }, []);

  const refreshData = useCallback(() => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    setRefreshStatus({ isRefreshing: true, error: null });
    const pending = (async () => {
      try {
        const data = await fetchLatestData();
        await saveAppData(data);
        dispatch({ type: "data/refresh", data });
        setRefreshStatus({ isRefreshing: false, error: null });
      } catch (error) {
        setRefreshStatus({
          isRefreshing: false,
          error: error.message || "Could not refresh the latest data.",
        });
        throw error;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();
    refreshPromiseRef.current = pending;
    return pending;
  }, []);

  const runWithLoader = useCallback(async (operation) => {
    operationCountRef.current += 1;
    setIsOperationLoading(true);
    try {
      return await operation();
    } finally {
      operationCountRef.current -= 1;
      if (operationCountRef.current === 0) setIsOperationLoading(false);
    }
  }, []);

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
    return runSettingsOperation(resetSampleDataService, null, true);
  }, [runSettingsOperation]);
  const value = useMemo(
    () => ({
      state,
      dispatch,
      isRefreshing: refreshStatus.isRefreshing,
      refreshError: refreshStatus.error,
      refreshData,
      isOperationLoading,
      runWithLoader,
      addExpense,
      updateExpense,
      deleteExpense,
      updateMonthSettings,
      resetSampleData,
    }),
    [
      state,
      refreshStatus,
      refreshData,
      isOperationLoading,
      runWithLoader,
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
