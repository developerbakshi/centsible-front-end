import React, { useState } from "react";
import BottomSheet from "./components/ui/BottomSheet.jsx";
import CategorySheet from "./features/categories/CategorySheet.jsx";
import AllExpensesSheet from "./features/expenses/AllExpensesSheet.jsx";
import ExpenseSheet from "./features/expenses/ExpenseSheet.jsx";
import Overview from "./features/overview/Overview.jsx";
import SettingsSheet from "./features/settings/SettingsSheet.jsx";
import { useAppState } from "./state/AppContext.jsx";

function App() {
  const { state } = useAppState();
  const [activeSheet, setActiveSheet] = useState(null);
  const expenseCount = Object.values(state.data.months).reduce(
    (total, month) => total + month.exp.length,
    0,
  );

  return (
    <div id="app" data-theme={state.data.theme || undefined}>
      {state.storageStatus === "loading" ? (
        <div className="app-state" role="status">
          Loading categories…
        </div>
      ) : state.storageStatus === "load-error" ? (
        <div className="app-state bad" role="alert">
          {state.storageError} Refresh the page to try again.
        </div>
      ) : (
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
      )}
    </div>
  );
}

export default App;
