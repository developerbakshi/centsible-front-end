import React, { useEffect, useRef, useState } from "react";
import LoadingOverlay from "./components/ui/LoadingOverlay.jsx";
import BottomSheet from "./components/ui/BottomSheet.jsx";
import CategorySheet from "./features/categories/CategorySheet.jsx";
import AllExpensesSheet from "./features/expenses/AllExpensesSheet.jsx";
import ExpenseSheet from "./features/expenses/ExpenseSheet.jsx";
import Overview from "./features/overview/Overview.jsx";
import SettingsSheet from "./features/settings/SettingsSheet.jsx";
import { useAppState } from "./state/AppContext.jsx";

function App() {
  const {
    state,
    isRefreshing,
    refreshData,
    refreshError,
    isOperationLoading,
  } = useAppState();
  const [activeSheet, setActiveSheet] = useState(null);
  const [pullDistance, setPullDistance] = useState(0);
  const pullStartRef = useRef(null);
  const lastAutomaticRefreshRef = useRef(0);
  const appRef = useRef(null);
  const expenseCount = Object.values(state.data.months).reduce(
    (total, month) => total + month.exp.length,
    0,
  );
  const isLoading = state.storageStatus === "loading";
  const isBlocking = isLoading || isRefreshing || isOperationLoading;

  useEffect(() => {
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
    const refreshFromPageShow = (event) => {
      if (event.persisted) refreshOnForeground();
    };

    document.addEventListener("visibilitychange", refreshOnForeground);
    window.addEventListener("focus", refreshOnForeground);
    window.addEventListener("pageshow", refreshFromPageShow);
    return () => {
      document.removeEventListener("visibilitychange", refreshOnForeground);
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
                disabled
                aria-label="Add expense (disabled)"
                title="Adding expenses is disabled"
              >
                <b>+</b>Add
              </button>
              <span className="expense-dock-divider" aria-hidden="true" />
              <button
                className="expense-dock-list"
                type="button"
                aria-label={`View all ${expenseCount} expenses`}
                onClick={() => setActiveSheet({ type: "allExpenses" })}
              >
                <span aria-hidden="true">☷</span>
                {expenseCount}
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
                  onAdd={(categoryId) =>
                    setActiveSheet({
                      type: "expense",
                      preselectedCategoryId: categoryId,
                    })
                  }
                  onEdit={(expenseId) =>
                    setActiveSheet({ type: "expense", expenseId })
                  }
                />
              )}
              {activeSheet?.type === "expense" && (
                <ExpenseSheet
                  expenseId={activeSheet.expenseId}
                  expenseMonthKey={activeSheet.expenseMonthKey}
                  preselectedCategoryId={activeSheet.preselectedCategoryId}
                  onClose={() =>
                    setActiveSheet(
                      activeSheet.expenseFromAllExpenses
                        ? { type: "allExpenses" }
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
      {isBlocking && <LoadingOverlay />}
    </div>
  );
}

export default App;
