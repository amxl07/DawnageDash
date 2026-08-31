# Mobile 2 Core Design

## Purpose

`mobile-2` is a new, independently designed fitness client that can connect to a SparkyFitness-compatible self-hosted server. It is not a reskin of `mobile/` or `SparkyFitnessMobile/`; no branded assets or substantial source are copied from either application.

The first implementation slice must be useful on its own: a user can explore a realistic demo, configure a server, sign in with email and password, view a daily summary, browse diary entries, search foods, add a food entry, inspect simple trends, and manage the active connection.

## Product Direction

The visual direction is calm, editorial, and optimistic rather than the existing Dawnage dark/red treatment. The light theme uses warm ivory, deep ink, jade, lime, and soft coral. The dark theme uses blue-black surfaces and restrained luminous accents. Large data typography, generous spacing, continuous-radius cards, concise copy, and one clear action per surface define the experience.

The five primary destinations are Today, Diary, Add, Insights, and You. Add is a first-class quick-log flow. The app supports system light/dark appearance, reduced-motion-safe transitions, dynamic type, 44-point touch targets, explicit loading/error/empty states, and screen-reader labels.

## Architecture

- Expo SDK 56, React Native 0.85, TypeScript, and Expo Router.
- `expo-dev-client` and EAS development builds are the supported native runtime. Expo Go is not the target environment.
- TanStack Query owns remote and demo query state. Network reachability drives its online manager.
- A `FitnessRepository` interface separates presentation from data access. `ConnectedFitnessRepository` uses the Sparky-compatible HTTP API; `DemoFitnessRepository` provides deterministic mutable in-memory data.
- Zod validates every server response used by this slice.
- `SessionProvider` persists only the normalized server URL, session token, and email in SecureStore. No password is stored.
- UI components consume semantic theme tokens. Feature screens do not contain raw brand colors.

## Data Flow

Server setup calls `GET /api/auth/settings` after URL normalization. Sign-in calls `POST /api/auth/sign-in/email`, forwarding a trusted `Origin` derived from the server URL. A successful response must contain a token. An MFA redirect is reported as unsupported by this first slice without destroying the saved server URL.

Daily data comes from `GET /api/daily-summary?date=YYYY-MM-DD`. Food search uses `GET /api/foods/foods-paginated`. Meal types come from `GET /api/meal-types`. Logging food uses `POST /api/food-entries/` and invalidates summary, diary, and search-related query keys.

Production builds reject plain HTTP. Development builds allow localhost and private-network URLs so a physical test device can reach a self-hosted server.

## Core Types

```ts
type AppSession =
  | { mode: 'demo'; email: 'demo@dawnage.local' }
  | { mode: 'connected'; serverUrl: string; token: string; email: string };

interface FitnessRepository {
  getDailySummary(date: string): Promise<DailySummary>;
  searchFoods(term: string): Promise<FoodSearchResult>;
  getMealTypes(): Promise<MealType[]>;
  addFoodEntry(input: AddFoodEntryInput): Promise<FoodEntry>;
}
```

## Error and Offline Behavior

HTTP failures become typed `ApiError` values with status and a safe message. Invalid response bodies produce a data-format error rather than reaching components. Queries pause while offline and resume on reconnect. Cached data remains visible with a compact offline banner. Mutations require connectivity in connected mode; demo mutations remain available offline.

## Security and Licensing Constraints

- Secrets and credentials never use `EXPO_PUBLIC_` variables.
- Session tokens use SecureStore and are removed on sign-out.
- Production connections require HTTPS.
- `mobile-2` does not import from `SparkyFitness/`, copy its assets, or copy its source files. Compatibility is implemented against observed HTTP endpoints and response shapes.
- Commercial use of the SparkyFitness server itself still requires the repository owner's permission under its license.

## Testing

Pure unit tests cover URL policy, response parsing, repository requests, demo mutations, and date/nutrition calculations. Provider tests cover session restoration and transitions. Focused component tests cover progress and diary presentation. The completion gate is a clean test run, TypeScript check, ESLint run, Expo dependency check, and Expo export bundle.

## Follow-on Subprojects

Apple Health/Health Connect synchronization, background tasks, notifications, widgets, Live Activities, barcode scanning, AI photo logging, workouts, medications, cycle tracking, pregnancy, family sharing, and complete localization are intentionally separate implementation slices. Each introduces independent native permissions, store policy, or domain behavior and requires physical-device validation.
