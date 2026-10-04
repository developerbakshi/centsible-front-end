import React, { useState } from "react";
import BottomSheet from "./components/ui/BottomSheet.jsx";
import CategorySheet from "./features/categories/CategorySheet.jsx";
import ExpenseSheet from "./features/expenses/ExpenseSheet.jsx";
import Overview from "./features/overview/Overview.jsx";
import SettingsSheet from "./features/settings/SettingsSheet.jsx";
import { useAppState } from "./state/AppContext.jsx";

function App() {
  const { state } = useAppState();
  const [activeSheet, setActiveSheet] = useState(null);

  return (
    <div id="app" data-theme={state.data.theme || undefined}>
      <Overview
        onOpenSettings={() => setActiveSheet({ type: "settings" })}
        onSelectCategory={(categoryId) =>
          setActiveSheet({ type: "category", categoryId })
        }
      />
      <button
        className="fab"
        type="button"
        disabled={state.storageStatus === "loading"}
        onClick={() => setActiveSheet({ type: "expense" })}
      >
        <b>+</b>Add expense
      </button>
      <BottomSheet
        open={Boolean(activeSheet)}
        onClose={() => setActiveSheet(null)}
      >
        {activeSheet?.type === "category" && (
          <CategorySheet
            categoryId={activeSheet.categoryId}
            onClose={() => setActiveSheet(null)}
            onAdd={(categoryId) =>
              setActiveSheet({ type: "expense", preselectedCategoryId: categoryId })
            }
            onEdit={(expenseId) =>
              setActiveSheet({ type: "expense", expenseId })
            }
          />
        )}
        {activeSheet?.type === "expense" && (
          <ExpenseSheet
            expenseId={activeSheet.expenseId}
            preselectedCategoryId={activeSheet.preselectedCategoryId}
            onClose={() => setActiveSheet(null)}
          />
        )}
        {activeSheet?.type === "settings" && (
          <SettingsSheet onClose={() => setActiveSheet(null)} />
        )}
      </BottomSheet>
    </div>
  );
}

export default App;
