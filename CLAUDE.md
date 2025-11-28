# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Budget app for personal finance management. Track income, fixed/variable expenses, and savings with Excel import capabilities. Built for private use (Swedish language interface).

**Stack**: React 19 + TypeScript + Vite + Tailwind CSS 4 + Supabase (BaaS)

## Development Commands

```bash
# Development
npm run dev              # Start dev server (Vite)

# Building
npm run build            # Type-check (tsc -b) + build
npm run preview          # Preview production build

# Linting
npm run lint             # Run ESLint
```

**IMPORTANT**: Always run `npm run build` locally before pushing to verify type safety and build success.

## Architecture Overview

### Data Model (Supabase)

The app uses a Supabase PostgreSQL database with Row Level Security (RLS). All types are defined in `src/types/database.ts`:

- **`incomes`** - Recurring monthly income sources (salary, etc.)
- **`fixed_expenses`** - Fixed monthly expenses (rent, subscriptions) with budget tracking
- **`savings`** - Savings allocations (short/long/risk types)
- **`transactions`** - Variable expenses/income with categories and receipts
- **`categories`** - User-defined transaction categories with icons
- **`import_profiles`** - Saved column mappings for Excel imports (bank/credit card)
- **`monthly_summaries`** - Cached summary data (optional)
- **`category_budgets`** - Budget goals per category (optional)

### Data Layer (`src/lib/api.ts`)

Central API module with functions for all CRUD operations. Key patterns:

- Uses Supabase client from `src/lib/supabase.ts`
- All create operations automatically attach `user_id` from auth session
- Transaction queries include joined category data via `.select('*, category:categories(*)')`
- `getDashboardSummary(year, month)` - Primary aggregation function that fetches all active data and calculates KPIs

### Authentication (`src/contexts/AuthContext.tsx`)

React Context providing auth state and methods:
- `user`, `session`, `loading` state
- `signUp()`, `signIn()`, `signOut()` methods
- Listens to Supabase auth state changes
- Used by `ProtectedRoute` component for route guarding

### Routing (`src/App.tsx`)

React Router setup:
- Public routes: `/`, `/login`, `/register`
- Protected routes under `/app/*` with `AppLayout`:
  - `/app` - Overview (dashboard)
  - `/app/incomes` - Manage recurring income
  - `/app/fixed-expenses` - Manage fixed expenses
  - `/app/variable-expenses` - Manage transactions
  - `/app/savings` - Manage savings
  - `/app/import` - Excel import functionality

### State Management

- **TanStack Query** (`@tanstack/react-query`) for server state
- React Context for auth only
- Component-level state for UI interactions

### Styling

- **Tailwind CSS 4** with `@tailwindcss/vite` plugin
- Shadcn/ui components in `src/components/ui/`
- Uses `tw-animate-css` for animations
- Utility functions in `src/lib/utils.ts` (cn() for class merging)

## Environment Variables

Required in `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

The app will throw an error on startup if these are missing (`src/lib/supabase.ts:6-8`).

## Git Workflow (CRITICAL)

From `.cursorrules`:

1. **NEVER commit directly to `main`** - Always create a feature branch
2. **Create Pull Requests** - All changes must go through PR workflow
3. **NEVER auto-merge PRs** - Create PR and STOP. Let user review and merge manually
4. **NEVER use force push** - Avoid `git push --force`
5. **Always pull before starting** - Run `git pull` to sync
6. **Verify build before push** - Run `npm run build` locally

Main branch for PRs: `feature/initial-setup`

## Database Patterns

### RLS (Row Level Security)
Database enforces user isolation - all queries automatically filter by authenticated user. No need for manual user_id filtering in queries.

### Joined Queries
When querying transactions with categories:
```typescript
.select('*, category:categories(*)')
```

### Active vs All Records
Most entities have `is_active` boolean. API provides both:
- `getFixedExpenses()` - All records
- `getActiveFixedExpenses()` - Only active records (used in calculations)

## Hosting & Infrastructure

- **Frontend**: Vercel Hobby Plan (free for non-commercial)
- **Backend/DB**: Supabase Free Tier
  - Pauses after 1 week inactivity
  - 500 MB data limit
  - 1 GB file storage (for receipts via Supabase Storage)

## Component Library

Uses Radix UI primitives via Shadcn/ui:
- `@radix-ui/react-dialog`, `react-label`, `react-select`, `react-separator`, `react-slot`, `react-tabs`
- Lucide React for icons

## Import Feature

The Excel import functionality (`src/pages/Import.tsx`):
- Uses `xlsx` library to parse Excel/CSV files
- Supports saved import profiles for column mapping
- Detects duplicates based on date + description + amount
- Allows profile names and default profile selection

## Language & Localization

UI is in Swedish. When adding features, maintain Swedish language for:
- User-facing text
- Error messages
- Comments in code (optional, but database field names use English)
