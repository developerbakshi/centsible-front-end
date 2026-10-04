import { createSeedData } from "../../constants/defaultData.js";
import { saveAppData } from "../../services/storage/appDataService.js";

function createId() {
  return Math.random().toString(36).slice(2, 9);
}

function saveMonth(data, monthKey, month) {
  const updatedData = {
    ...data,
    months: { ...data.months, [monthKey]: month },
  };
  return saveAppData(updatedData).then(() => updatedData);
}

export async function updateMonthSettings(data, { monthKey, change }) {
  const month = data.months[monthKey];
  if (!month) throw new Error("The selected month is unavailable.");

  if (change.type === "budget") {
    if (!Number.isFinite(change.value) || change.value < 0) {
      throw new Error("The monthly budget must be a non-negative amount.");
    }
    return saveMonth(data, monthKey, { ...month, budget: change.value });
  }

  if (change.type === "category/update") {
    const category = month.cats.find(({ id }) => id === change.categoryId);
    if (!category) throw new Error("The selected category is unavailable.");

    if (
      change.field === "limit" &&
      (!Number.isFinite(change.value) || change.value < 0)
    ) {
      throw new Error("A category limit must be a non-negative amount.");
    }
    if (!["emoji", "name", "limit"].includes(change.field)) {
      throw new Error("The category field is invalid.");
    }

    return saveMonth(data, monthKey, {
      ...month,
      cats: month.cats.map((item) =>
        item.id === change.categoryId
          ? { ...item, [change.field]: change.value }
          : item,
      ),
    });
  }

  if (change.type === "category/add") {
    const category = {
      id: createId(),
      name: "New category",
      emoji: "⭐",
      limit: 0,
    };
    return saveMonth(data, monthKey, {
      ...month,
      cats: [...month.cats, category],
    });
  }

  if (change.type === "category/delete") {
    if (month.cats.length < 2) return data;
    if (!month.cats.some(({ id }) => id === change.categoryId)) {
      throw new Error("The selected category is unavailable.");
    }

    return saveMonth(data, monthKey, {
      ...month,
      cats: month.cats.filter(({ id }) => id !== change.categoryId),
      exp: month.exp.filter(({ cat }) => cat !== change.categoryId),
    });
  }

  throw new Error("The settings change is invalid.");
}

export async function resetSampleData() {
  const data = createSeedData();
  await saveAppData(data);
  return data;
}
