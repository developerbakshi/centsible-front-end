const THEME_KEY = "centsible.theme";

export async function loadThemePreference() {
  const theme = localStorage.getItem(THEME_KEY);

  if (theme === null) return "";
  if (theme === "light" || theme === "dark") return theme;

  throw new Error("The saved theme preference is invalid.");
}

export async function saveThemePreference(theme) {
  if (theme !== "light" && theme !== "dark") {
    throw new Error("Theme must be set to light or dark.");
  }

  localStorage.setItem(THEME_KEY, theme);
}

export async function clearThemePreference() {
  localStorage.removeItem(THEME_KEY);
}
