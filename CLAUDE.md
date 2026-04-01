# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DawnageAIDash is a fitness coaching platform with three roles: **client** (fitness users), **coach** (assigned to clients), and **admin** (system management). Coaches can view their clients' dashboards; admins can view any coach and their clients.

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server (Express + Vite HMR) on port 5000 |
| `npm run build` | Build client only (Vite) |
| `npm run build:full` | Build client (Vite) + server (esbuild) |
| `npm start` | Run production server from `/dist` |
| `npm run check` | TypeScript type checking (no tests or linter configured) |
| `npm run db:push` | Push Drizzle schema changes to Supabase PostgreSQL |
| `npm run db:studio` | Open Drizzle Studio for database inspection |

## Architecture

### Client-Driven Data Access (No REST API)

The server (`server/index.ts`) is a thin Express wrapper that serves the Vite dev middleware (development) or static files (production). **There are no custom API endpoints** in `server/routes.ts`.

All data fetching happens **client-side via the Supabase JS client** (`client/src/lib/supabase.ts`). Components query Supabase directly, and Row Level Security (RLS) on the database enforces access control. React Query (`client/src/lib/queryClient.ts`) manages caching/state, configured with `staleTime: Infinity` and no auto-refetch.

Typical data flow:
```
React Component → useQuery() → supabase.from('table').select(...) → Supabase PostgreSQL
```

### Path Aliases

- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`
- `@assets/*` → `client/src/assets/*`

Configured in both `tsconfig.json` and `vite.config.ts`.

### Database Schema

All tables defined in `shared/schema.ts` using Drizzle ORM. Zod validation schemas are auto-generated from Drizzle tables via `createInsertSchema()`. Types are inferred (`type User = typeof users.$inferSelect`). This is the single source of truth for both database schema and TypeScript types.

Key tables: `users`, `daily_check_ins`, `body_measurements`, `workout_plans`, `workout_templates`, `meal_plans`, `meal_templates`, `workout_logs`, `progress_photos`, `food_items`, `client_payments`, `coach_commissions`.

### Authentication

Supabase Auth with JWT. `AuthContext` (`client/src/contexts/AuthContext.tsx`) manages session state and provides `useAuth()`. It also tracks `viewedUserId` (coach viewing a client) and `viewedCoachId` (admin viewing a coach) in sessionStorage for role-switching.

### Routing

Client-side routing uses **Wouter** (not React Router). All page components are lazy-loaded with `React.lazy()` and wrapped in `<Suspense>`. Routes are protected via `<ProtectedRoute>` which checks auth state. Role-based redirects happen at the `/` route.

### UI Stack

Radix UI primitives (in `client/src/components/ui/`) + Tailwind CSS + shadcn/ui patterns. Forms use React Hook Form + Zod. Charts use Recharts. Drag-and-drop uses @dnd-kit.

### Build Chunking

Vite is configured with manual chunks in `vite.config.ts`: `react-vendor`, `query`, `charts`, `ui`, `supabase`. Keep this in mind when adding large dependencies.

## Deployment

Deployed to Vercel as a static SPA (`vercel.json` rewrites all routes to `index.html`). The Express server is only used for local development.

## Environment Variables

Required in `.env` at project root:
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — client-side Supabase connection
- `DATABASE_URL` — server-side PostgreSQL connection (for Drizzle migrations)
- `SUPABASE_SERVICE_ROLE_KEY` — server-side admin operations
- `VITE_COACH_ACCESS_KEY` — secret key for coach registration
