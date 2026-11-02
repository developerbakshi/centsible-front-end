import React, { useEffect, useRef, useState } from "react";
import DeleteConfirmation from "./components/ui/DeleteConfirmation.jsx";
import LoadingOverlay from "./components/ui/LoadingOverlay.jsx";
import BottomSheet from "./components/ui/BottomSheet.jsx";
import CategorySheet from "./features/categories/CategorySheet.jsx";
import AllExpensesSheet from "./features/expenses/AllExpensesSheet.jsx";
import ExpenseSheet from "./features/expenses/ExpenseSheet.jsx";
import Overview from "./features/overview/Overview.jsx";
import SettingsSheet from "./features/settings/SettingsSheet.jsx";
import { useAppState } from "./state/AppContext.jsx";

function isStandaloneApp() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function App() {
  const {
    state,
    addExpense,
    deleteExpense,
    isRefreshing,
    refreshData,
    refreshError,
    isOperationLoading,
    runWithLoader,
  } = useAppState();
  const [activeSheet, setActiveSheet] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [expenseToast, setExpenseToast] = useState(null);
  const [pullDistance, setPullDistance] = useState(0);
  const pullStartRef = useRef(null);
  const lastAutomaticRefreshRef = useRef(0);
  const appRef = useRef(null);
  const currentMonth = state.data.months[state.currentMonth];
  const expenseCount = currentMonth?.exp.length ?? 0;
  const isLoading = state.storageStatus === "loading";
  const isBlocking = isLoading || isRefreshing || isOperationLoading;
  const isPwaStartup = isLoading && isStandaloneApp();

  useEffect(() => {
    if (!expenseToast) return undefined;
    const timeout = window.setTimeout(() => setExpenseToast(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [expenseToast]);

  useEffect(() => {
    if (state.storageStatus === "loading") return;
    document.getElementById("pwa-startup-screen")?.remove();
  }, [state.storageStatus]);

  useEffect(() => {
    const resetToHome = () => {
      setActiveSheet(null);
      setDeleteConfirmation(null);
      setExpenseToast(null);
      setPullDistance(0);
      appRef.current?.scrollTo(0, 0);
      window.scrollTo(0, 0);
    };

    const refreshOnForeground = () => {
      if (
        document.visibilityState !== "visible" ||
        state.storageStatus === "loading" ||
        Date.now() - lastAutomaticRefreshRef.current < 15_000
      ) {
        return;
      }

      lastAutomaticRefreshRef.current = Date.now();
      refreshData().catch(() => {});
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      resetToHome();
      refreshOnForeground();
    };
    const refreshFromPageShow = (event) => {
      if (event.persisted) {
        resetToHome();
        refreshOnForeground();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", refreshOnForeground);
    window.addEventListener("pageshow", refreshFromPageShow);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", refreshOnForeground);
      window.removeEventListener("pageshow", refreshFromPageShow);
    };
  }, [refreshData, state.storageStatus]);

  function handleTouchStart(event) {
    if (
      isBlocking ||
      activeSheet ||
      event.touches.length !== 1 ||
      appRef.current?.scrollTop > 0 ||
      event.target.closest?.("input, textarea, select, button, .sheet")
    ) {
      pullStartRef.current = null;
      return;
    }

    pullStartRef.current = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    };
  }

  function handleTouchMove(event) {
    const start = pullStartRef.current;
    if (!start || event.touches.length !== 1) return;

    const deltaY = event.touches[0].clientY - start.y;
    const deltaX = Math.abs(event.touches[0].clientX - start.x);
    if (deltaY > deltaX) {
      setPullDistance(Math.min(deltaY, 72));
    }
  }

  function handleTouchEnd(event) {
    const start = pullStartRef.current;
    const touch = event.changedTouches[0];
    pullStartRef.current = null;
    setPullDistance(0);

    if (
      !isBlocking &&
      start &&
      touch &&
      touch.clientY - start.y >= 60 &&
      !isRefreshing
    ) {
      refreshData().catch(() => {});
    }
  }

  function requestExpenseDelete(expense, monthKey) {
    setDeleteConfirmation({ expense, monthKey, error: "" });
  }

  async function confirmExpenseDelete() {
    if (!deleteConfirmation) return;
    const target = deleteConfirmation;

    try {
      await runWithLoader(() =>
        deleteExpense({
          monthKey: target.monthKey,
          expenseId: target.expense.id,
        }),
      );
      setDeleteConfirmation(null);
      setExpenseToast({
        type: "deleted",
        expense: target.expense,
        monthKey: target.monthKey,
      });
      if (activeSheet?.type === "expense") {
        setActiveSheet(
          activeSheet.expenseFromAllExpenses
            ? { type: "allExpenses" }
            : activeSheet.expenseFromCategory
              ? { type: "category", categoryId: activeSheet.categoryId }
              : null,
        );
      }
    } catch (error) {
      setDeleteConfirmation({
        ...target,
        error:
          error.message || "Could not delete this expense. Please try again.",
      });
    }
  }

  async function undoExpenseDelete() {
    if (expenseToast?.type !== "deleted") return;
    const { expense } = expenseToast;
    setExpenseToast(null);

    try {
      await runWithLoader(() =>
        addExpense({
          categoryId: expense.cat,
          amount: expense.amt,
          merchant: expense.merchant ?? "",
          bank: expense.bank ?? "",
        }),
      );
      setExpenseToast({ type: "notice", message: "Expense restored." });
    } catch (error) {
      setExpenseToast({
        type: "notice",
        message: error.expenseCreated
          ? "The expense may have been restored. Refresh before trying again."
          : "Could not restore the expense. Please try again.",
      });
    }
  }

  return (
    <div
      id="app"
      ref={appRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div className="app-content" inert={isBlocking}>
        {(pullDistance > 12 || refreshError) && !isBlocking && (
          <div className="refresh-indicator" role="status" aria-live="polite">
            {refreshError
              ? `Refresh failed: ${refreshError}`
              : pullDistance >= 60
                ? "Release to refresh"
                : "Pull down to refresh"}
          </div>
        )}
        {state.storageStatus === "load-error" ? (
          <div className="app-state bad" role="alert">
            {state.storageError} Refresh the page to try again.
          </div>
        ) : state.storageStatus === "ready" ||
          state.storageStatus === "save-error" ? (
          <>
            <Overview
              onOpenSettings={() => setActiveSheet({ type: "settings" })}
              onSelectCategory={(categoryId) =>
                setActiveSheet({ type: "category", categoryId })
              }
            />
            <div className="expense-dock" aria-label="Expense actions">
              <button
                className="expense-dock-add"
                type="button"
                aria-label="Add expense"
                onClick={() => setActiveSheet({ type: "expense" })}
              >
                + Add
              </button>
              <hr className="expense-dock-divider" aria-hidden="true" />
              <button
                className="expense-dock-list"
                type="button"
                aria-label={`View all ${expenseCount} expenses`}
                onClick={() => setActiveSheet({ type: "allExpenses" })}
              >
                ☷ {expenseCount}
              </button>
            </div>
            <BottomSheet
              open={Boolean(activeSheet)}
              onClose={() => setActiveSheet(null)}
              className={
                activeSheet?.type === "allExpenses" ||
                activeSheet?.expenseFromAllExpenses
                  ? "sheet-all-expenses"
                  : ""
              }
            >
              {activeSheet?.type === "allExpenses" && (
                <AllExpensesSheet
                  onClose={() => setActiveSheet(null)}
                  onRequestDelete={requestExpenseDelete}
                  onEdit={(expenseId, expenseMonthKey) =>
                    setActiveSheet({
                      type: "expense",
                      expenseId,
                      expenseMonthKey,
                      expenseFromAllExpenses: true,
                    })
                  }
                />
              )}
              {activeSheet?.type === "category" && (
                <CategorySheet
                  categoryId={activeSheet.categoryId}
                  onClose={() => setActiveSheet(null)}
                  onRequestDelete={requestExpenseDelete}
                  onAdd={(categoryId) =>
                    setActiveSheet({
                      type: "expense",
                      preselectedCategoryId: categoryId,
                      categoryId,
                      expenseFromCategory: true,
                    })
                  }
                  onEdit={(expenseId) =>
                    setActiveSheet({
                      type: "expense",
                      expenseId,
                      categoryId: activeSheet.categoryId,
                      expenseFromCategory: true,
                    })
                  }
                />
              )}
              {activeSheet?.type === "expense" && (
                <ExpenseSheet
                  expenseId={activeSheet.expenseId}
                  expenseMonthKey={activeSheet.expenseMonthKey}
                  preselectedCategoryId={activeSheet.preselectedCategoryId}
                  onRequestDelete={requestExpenseDelete}
                  onClose={() =>
                    setActiveSheet(
                      activeSheet.expenseFromAllExpenses
                        ? { type: "allExpenses" }
                        : activeSheet.expenseFromCategory
                          ? {
                              type: "category",
                              categoryId: activeSheet.categoryId,
                            }
                          : null,
                    )
                  }
                />
              )}
              {activeSheet?.type === "settings" && (
                <SettingsSheet onClose={() => setActiveSheet(null)} />
              )}
            </BottomSheet>
          </>
        ) : null}
      </div>
      <DeleteConfirmation
        target={deleteConfirmation}
        pending={isOperationLoading}
        onCancel={() => setDeleteConfirmation(null)}
        onConfirm={confirmExpenseDelete}
      />
      {expenseToast && (
        <div className="expense-toast" role="status" aria-live="polite">
          <span>
            {expenseToast.type === "deleted"
              ? "Expense deleted"
              : expenseToast.message}
          </span>
          {expenseToast.type === "deleted" && (
            <button type="button" onClick={undoExpenseDelete}>
              Undo
            </button>
          )}
        </div>
      )}
      {isBlocking && !isPwaStartup && <LoadingOverlay />}
    </div>
  );
}

export default App;
