# Centsible

Centsible is a mobile-first monthly budget and expense tracker designed for
iPhone 17 Pro (402 × 874 pt), including the Dynamic Island and home-indicator
safe areas. The app is a React single-page application built with Vite and
deployed on Vercel.

This README is both a project guide and context for AI-assisted design,
implementation, and product discussions. It describes behavior that exists in
the code today, calls out incomplete areas, and records product constraints.
When the implementation and this document disagree, verify the current code
and update this document when behavior changes.

## Product purpose

The app answers three monthly budgeting questions:

- How much have I spent this month?
- How much budget is left?
- For each category, how much have I spent and how much remains?

The visual direction is modern, minimal, calm, spacious, and crisp, with
distinctive details and no generic stack of cards. The target is a native-feeling
iPhone experience, not a desktop-responsive product.

## Current functionality

### Overview

- Shows the selected month and year with previous/next month controls.
- Keeps the month navigator sticky at the top of the app’s scroll area. The
  Centsible wordmark scrolls away while the month selector remains visible.
- Shows the monthly budget remaining, spending status relative to an even pace,
  an even-spend progress tick, daily spending ribbon, spent total, budget total,
  days remaining, and suggested spend per day.
- Lists categories ordered by spending as a share of their budget, highest
  first. Each row includes the category name, limit, progress bar, spent amount,
  and remaining/over-budget amount.
- Progress bars animate when rendered and can include an even-pace marker,
  target value, and category emoji marker.

### Expense actions and sheets

- A fixed bottom split pill contains **Add** and **All expenses** actions.
- **Add** is visible but disabled. Adding expenses is not currently available
  through the interface.
- **All expenses** opens a tall scrolling sheet with all loaded expenses, sorted
  newest first by API `created_at`.
- A third dock segment opens the Weekly view. Its sheet shows a month-clipped
  calendar week, its remaining allowance, daily spending rail, and category
  shares; arrows navigate weeks within the selected month.
- An all-expenses row shows merchant, amount, category emoji and name, bank,
  expense date, and—when the API date contains a time—the local time.
- Selecting an expense opens the existing edit sheet. Cancel returns to the
  all-expenses list.
- Category detail shows category spending, remaining budget, and the category’s
  expenses. Selecting an expense opens the same edit sheet.
- Expense date is read-only in the edit sheet because the update API does not
  support editing dates.
- Expense delete controls remain visible but disabled. The frontend has local
  delete logic, but there is no wired delete API request.

### Budget and category settings

- Settings show the current month’s total budget and category limits.
- Category limits are listed from highest to lowest.
- Budget, category name, emoji, and limit edits currently save to the browser’s
  local app data.
- Add/delete category controls remain visible but disabled.
- The category API currently provides categories; there is no category
  write/delete API integration.
- Settings can reset local sample data. This does not change the API’s data.

### Loading, refresh, and navigation

- On app startup, categories and expenses are fetched from the API.
- A ripple loader blocks interaction during initial load, refresh, and
  operations using the shared loader.
- Pulling down from the top of the main screen by at least 60 px triggers a
  refresh.
- The app refreshes when the document becomes visible or the window receives
  focus, with a 15-second throttle. A `pageshow` event triggers the same refresh
  when the page is restored from the back-forward cache.
- Category detail, expense editor, settings, and all-expenses views are bottom
  sheets managed by app-level React state. There is no router.

## Theme and visual system

The app follows the operating system’s appearance using
`prefers-color-scheme`. Light mode is used when the system is light; dark mode
when it is dark. The app updates automatically if the system appearance changes.
There is no in-app theme selector or saved theme override.

The palette is defined in [`src/styles/tokens.css`](./src/styles/tokens.css):

| Token | Light | Dark | Purpose |
| --- | --- | --- | --- |
| `--bg` | `#f3f6f2` | `#0a100f` | Main background |
| `--ink` | `#0d1f1b` | `#eaf2ef` | Primary text |
| `--mute` | `#66756f` | `#8aa098` | Secondary text |
| `--line` | `#dbe3de` | `#1f2d2a` | Borders and dividers |
| `--acc` | `#0a6b5c` | `#34d3b6` | Teal accent |
| `--ok` | `#178a4c` | `#4ade80` | Within-budget status |
| `--warn` | `#c2670a` | `#fbbf24` | Caution status |
| `--bad` | `#d13b3b` | `#f87171` | Over-budget/error status |
| `--track` | `#e1e8e3` | `#1c2a27` | Progress track |
| `--card` | `#fff` | `#13201d` | Card surface |
| `--line-strong` | `#cdd7d2` | `#2a3b37` | Weekly rail zero-day stub |
| `--ok-on-ink` | `#4ade80` | `#178a4c` | Green status on the dock |
| `--warn-on-ink` | `#fbbf24` | `#c2670a` | Amber status on the dock |
| `--bad-on-ink` | `#f87171` | `#d13b3b` | Red status on the dock |

Other design conventions:

- Large, light-weight currency numerals use tabular figures.
- Global buttons have 44 px minimum dimensions by default. Preserve accessible
  touch targets when adjusting control-specific sizing.
- The brand icon direction is a tick dial forming a “c”, with a crossing bar
  suggesting a cent sign. Existing icons and loader assets live under `public/`.
- The month navigator is sticky at `top: 0`. Safe-area top padding is applied to
  the scrolling brand row so the sticky navigator can reach the top edge.
- The main app scroll container handles horizontal overflow; bottom sheets
  account for the home-indicator safe area.
- Motion should remain restrained and consistent with the existing progress
  bar, sheet, and loader animations.

## Business logic

### Money

- API amounts and budgets are decimal dollar values, not integer cents.
- Currency input accepts a signed number with at most two decimal places.
- Submitted expense amounts must be valid and nonzero.
- Amounts are rounded to two decimal places before they are stored or sent.
- Totals and remaining values are derived from the selected month’s expenses
  and budget; do not persist derived totals.

### Monthly overview

- `spent` is the sum of expense amounts in the selected month.
- `left` is `monthly budget - spent`.
- The month has `daysInMonth(year, month)` days.
- Elapsed days are the full month for past months, zero for future months, and
  today’s day number for the current month.
- Days remaining are computed by `getDaysLeft`. For the current month this
  includes today.
- The even-spend pace is elapsed days divided by total days while the month is
  in progress. For a closed or not-yet-started month, pace is `null`.
- `paceDifference` is actual spending minus the budget amount expected at the
  even-spend pace. A positive result is “ahead of” (overspending relative to)
  the pace; a negative result is “under” the pace.
- Suggested per-day spending is remaining budget divided by days remaining,
  rounded to cents, when the month is open and not over budget. It is otherwise
  zero.
- The status colors use category ratio thresholds: red at or above 100% of
  budget, amber at or above 80%, and green below 80%. The hero has related
  over-budget and remaining-budget status logic.
- Daily ribbon values are derived by summing expenses for each calendar day.

### Weekly view

- Weeks start on Monday and are clipped to the selected month. The opening
  week is the current week for the current month, the final week for a past
  month, and the first week for a future month.
- Current and past weeks use a static share of the monthly budget and category
  limits, proportional to the number of days in that clipped week.
- Future weeks in the current month use an adaptive allowance: the amount left
  in the month is divided across the days after today, then multiplied by the
  number of days in the selected week. Each category's future allowance is
  based on that category's own remaining monthly limit, spread across the same
  days after today; a category cannot receive a future share larger than its
  remaining monthly amount.
- Weekly remaining amounts are allowance minus spending within that week.
  Future allowances are zero when the month is already over budget.
- Status tones use the same thresholds as category progress: red at or above
  100%, amber at or above 80%, and green below 80%.
- Allowances, remaining amounts, and aggregated spending are rounded to cents;
  category allowance rounding differences are not redistributed. Hero, rail,
  and dock values use whole-dollar formatting where specified.
- Category rows sort by weekly spend-to-allowance ratio, descending, retaining
  the source category order for ties. No weekly values are persisted or sent to
  the API.

### Dates and month selection

- Month keys use `YYYY-MM`; expense dates use local calendar `YYYY-MM-DD`.
- API `expense_date` is parsed as a JavaScript `Date`, then grouped by its
  device-local calendar date.
- All-expenses ordering is by `createdAt` descending, not by expense date.
- If `expense_date` contains an hour and minute, its time is formatted for the
  device’s local time zone; date-only API values do not get a fabricated time.
- The date input uses the browser’s native date control and locale format.
- Month navigation creates an empty month using a neighboring month’s budget
  and cloned categories when that month is not already in state.
- A month transition must preserve the rest of reducer state, especially
  `storageStatus`. Dropping it previously caused a blank screen.

### Expense update mapping

The UI’s note value is represented as `merchant · bank`. On edit:

- Only changed API fields are sent.
- Amount maps to `amount` in dollars.
- Category ID maps to the category’s uppercase name in `category`.
- A changed merchant or bank maps to only the changed `merchant` and/or `bank`
  property.
- Date changes are rejected by the frontend service because the API contract
  currently has no date update field.
- On API success, the local in-memory month and localStorage snapshot are
  updated.

The note convention is delimiter-based. If merchant or bank names contain the
exact ` · ` delimiter, the split may be ambiguous; do not silently change this
mapping without discussing its effect on the API contract and UI.

## Data sources, persistence, and API

### API

The frontend currently uses this API base:

```text
https://api-centsible.vercel.app
```

Implemented endpoints:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/categories` | Load categories |
| `GET` | `/expenses` | Load expenses |
| `PUT` | `/expenses/{expense_id}` | Update changed expense fields |

Category response fields consumed by the app:

```json
{
  "id": 1,
  "name": "FOOD",
  "emoji": "🍽️",
  "budget": 300
}
```

Expense response fields consumed by the app include:

```json
{
  "id": 1,
  "category_id": 1,
  "amount": 12.34,
  "expense_date": "2026-10-08T13:30:00Z",
  "created_at": "2026-10-08T13:31:00Z",
  "merchant": "Cafe",
  "bank": "BOFA"
}
```

The date/time example is illustrative; honor the actual API contract. The
category service validates response shapes and converts IDs to strings and
`budget` to the app’s `limit`. The expense service validates response shapes,
converts IDs to strings, rounds dollars to cents, derives the local calendar
date, and builds the merchant/bank note.

### App state shape

The context/reducer stores data approximately in this shape:

```js
{
  theme: "", // retained in the local data shape; system appearance is authoritative
  months: {
    "2026-10": {
      budget: 5000,
      cats: [
        { id: "1", name: "FOOD", emoji: "🍽️", limit: 300 }
      ],
      exp: [
        {
          id: "42",
          cat: "1",
          amt: 12.34,
          date: "2026-10-08",
          time: "1:30 PM", // optional; present when API expense_date has time
          createdAt: "2026-10-08T13:31:00.000Z",
          merchant: "Cafe",
          bank: "BOFA",
          note: "Cafe · BOFA"
        }
      ]
    }
  }
}
```

The active month key is separate reducer state. Expenses are assigned to month
buckets using their locally interpreted expense date. Do not store computed
spent totals or remaining balances in this shape.

Because browser fetch calls are cross-origin, the API must allow the deployed
Vercel origin and local development origin through CORS. A CORS failure appears
as a connection/request error in the app even when the API is reachable outside
the browser.

### localStorage and refresh semantics

The local app-data service stores a validated snapshot under:

```text
centsible.v2
```

However, current startup and refresh behavior fetches categories and expenses
from the API and replaces the app’s month data with that result. It is not a
durable offline-first source of truth.

Implications:

- API expenses are loaded into device-local month buckets at startup/refresh.
- Successful expense edits are sent to the API, then the local snapshot is
  updated.
- A later API refresh can replace that local snapshot.
- Budget and category settings currently use localStorage, but API startup
  rebuilds category/month data; local budget/category edits may therefore be
  lost on reload or refresh.
- The monthly budget initially equals the sum of API category budgets. Settings
  can subsequently modify the local month budget.
- No account-level sync or multi-device settings persistence is implemented.

Do not claim that settings are server-persisted, offline-safe, or synchronized
across devices without implementing and verifying those capabilities.

## Known limitations and open concerns

- Add expense is disabled in the bottom dock and category sheet.
- Delete expense is disabled; no `DELETE /expenses/{id}` request is wired.
- Add/delete category controls are disabled; no category write endpoints are
  wired.
- Expense date editing is unavailable in the API and therefore disabled.
- Settings persist locally only and can be overwritten by API initialization or
  refresh.
- The native iOS date field has been difficult to size consistently. Current
  CSS constrains its width and centers the native displayed value, but verify
  on a real iPhone: desktop/browser width measurements do not establish iOS
  Safari rendering.
- CORS configuration has previously varied by origin/port. Verify both the
  Vercel production origin and the exact local development origin when API calls
  fail in-browser.
- There is no test script configured in `package.json`; build and diagnostics
  are the available routine checks unless tests are added.
- Weekly fixed costs are not separated: Bills & Utilities and other fixed
  expenses count like ordinary categories, so weekly "left" can be inflated
  until a bill is paid.
- The Weekly view is limited to weeks inside the selected month; change the
  Overview month to access another month's weeks.

## Project structure

The active Vite project is the directory containing this README, `package.json`,
and `src/`.

```text
src/
  App.jsx                         App shell, sheets, refresh, bottom dock
  main.jsx                        React entry point and global CSS imports
  components/
    ui/
      BottomSheet.jsx             Shared accessible sheet shell
      LoadingOverlay.jsx          Blocking animated loader
      bottomSheet.css
  constants/
    defaultData.js                Sample data for the reset action
  features/
    categories/
      CategorySheet.jsx           Category spending and expense list
      categories.css
    expenses/
      AllExpensesSheet.jsx         Newest-first all-expenses list
      ExpenseSheet.jsx             Add/edit form and validation
      expenseService.js            Client-side expense operations/API update mapping
      expenses.css
    overview/
      Overview.jsx                 Monthly calculations and overview components
      overview.css
    week/
      weekCalculations.js           Pure weekly budget and date calculations
      WeekSheet.jsx                 Weekly allowance, day rail, and category sheet
      week.css                      Weekly dock and sheet styling
    settings/
      SettingsSheet.jsx            Monthly/category settings UI
      settingsService.js           Local settings persistence and sample reset
      settings.css
  services/
    categories/
      categoryService.js           Categories API access/normalization
    expenses/
      expenseService.js            Expenses GET/PUT API access/normalization
    storage/
      appDataService.js             localStorage snapshot and validation
  state/
    AppContext.jsx                  Global state, API initialization/refresh
    appReducer.js                   State transitions and month creation
  styles/
    global.css                      Reset, app scroll/safe-area layout, overlay
    tokens.css                      Light/dark design tokens
  utils/
    category.js                     Category display formatting
    currency.js                     Currency parsing/formatting
    date.js                         Month/date utilities
public/
  centsible-loader-ripple.svg       Animated blocking loader
  favicon and Apple touch icons      Browser/home-screen branding
```

Use functional React components and hooks. Keep API, storage, date, currency,
and business logic out of presentation JSX where an existing service, reducer,
or utility is appropriate. Continue the current feature-oriented organization.

## Local development

Requirements: Node.js and npm.

From the project root (the directory containing this README):

```sh
npm ci
npm run dev
```

The development server normally uses `http://localhost:5173/`. To access it
from another device on the same network, start Vite with an external host bind:

```sh
npm run dev -- --host 0.0.0.0
```

Create and preview a production build:

```sh
npm run build
npm run preview
```

Current Vercel settings for this Vite app:

| Setting | Value |
| --- | --- |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Root directory | The folder containing this README and `package.json` |

The lockfile must be checked in for `npm ci` to work. The production branch is
configured in Vercel project settings, not in the build command.

## Guidance for AI assistants

Use this section as standing product and engineering context:

1. **Target device:** iPhone 17 Pro only, 402 × 874 pt. Do not add desktop
   layouts or broaden the supported device scope without approval.
2. **Source of truth:** current code and the API contract define implemented
   behavior. This README records the intent and known gaps; verify code before
   relying on a historical statement.
3. **Preserve the product:** do not add, remove, or “improve” features, copy,
   colors, spacing, or animations beyond the user’s explicit request.
4. **Ask before significant decisions:** when multiple meaningful product or
   interaction choices exist, give 2–3 concise options with trade-offs and a
   recommendation; ask one question at a time and wait for the user’s choice.
   For visual changes, show a text or browser mockup/preview before treating it
   as final.
5. **Implement explicit requests:** make the requested change directly when the
   user has clearly selected a behavior or design. Keep the change surgical and
   summarize what changed and what remains unverified.
6. **Do not invent backend features:** do not enable Add/Delete, date edits,
   category mutations, or remote settings persistence without confirming API
   support and implementing the relevant endpoint flow.
7. **Keep totals derived:** spending, remaining amounts, category totals, and
   other computed values must be derived from budget and expense data, not
   duplicated as stored state.
8. **Maintain iOS details:** preserve the safe-area layout, 44 px touch targets,
   native date picker unless explicitly changed, system light/dark mode, and
   restrained animations. Verify native controls on a real device when their
   Safari rendering is relevant.
9. **Use existing patterns:** functional components only; use hooks and the
   existing context/reducer/services/utilities. Avoid new libraries unless the
   user approves them.
10. **Validate changes:** run `npm run build`, check diagnostics when available,
    and perform a focused browser/device check for UI behavior. State clearly
    when the actual iPhone behavior has not been verified.
11. **Document behavior changes:** update this README when API contracts,
    persistence semantics, available actions, core calculations, or product
    constraints change.

## Deployment and security notes

- The app is a frontend and calls the Centsible API directly from the browser.
- Do not add API secrets or credentials to frontend source. Anything shipped
  to the browser is public.
- No API authentication flow is described by the current frontend contract.
- Configure CORS on the API for the actual Vercel domain and local development
  origin; do not work around CORS by exposing credentials or using an
  unapproved proxy.
- On deployment failures, verify the selected Vercel production branch, project
  root directory, presence of `package-lock.json`, `npm ci`, build command, and
  `dist` output directory.
