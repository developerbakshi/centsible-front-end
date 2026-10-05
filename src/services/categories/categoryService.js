const CATEGORIES_URL = "https://api-centsible.onrender.com/categories";

function normalizeCategory(category) {
  if (
    category === null ||
    typeof category !== "object" ||
    !Number.isInteger(category.id) ||
    typeof category.name !== "string" ||
    typeof category.emoji !== "string" ||
    !Number.isFinite(category.budget) ||
    category.budget < 0
  ) {
    throw new Error("The categories API returned an invalid category.");
  }

  return {
    id: String(category.id),
    name: category.name,
    emoji: category.emoji,
    limit: category.budget,
  };
}

export async function getCategories() {
  let response;
  try {
    response = await fetch(CATEGORIES_URL);
  } catch {
    throw new Error("Could not connect to the categories API.");
  }

  if (!response.ok) {
    throw new Error(`The categories API request failed (${response.status}).`);
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("The categories API returned invalid JSON.");
  }

  if (!Array.isArray(result) || result.length === 0) {
    throw new Error("The categories API returned no categories.");
  }

  return result.map(normalizeCategory);
}
