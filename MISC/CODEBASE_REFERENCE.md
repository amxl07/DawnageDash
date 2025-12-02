# DawnAge AI Dashboard - Comprehensive Codebase Reference

**Last Updated:** November 5, 2025
**Version:** 1.0.0
**Status:** MVP with Mock Data

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Technology Stack](#technology-stack)
3. [Project Architecture](#project-architecture)
4. [Database Architecture](#database-architecture)
5. [Backend Deep Dive](#backend-deep-dive)
6. [Frontend Deep Dive](#frontend-deep-dive)
7. [Data Flow Analysis](#data-flow-analysis)
8. [Component Catalog](#component-catalog)
9. [Current State & Integration Points](#current-state--integration-points)
10. [Development Workflow](#development-workflow)
11. [Future Enhancement Roadmap](#future-enhancement-roadmap)

---

## Executive Summary

**DawnAge AI Dashboard** is a premium fitness coaching application designed to provide comprehensive tracking, analytics, and insights for personal fitness journeys. The application combines real-time data tracking with sophisticated visualizations to help users and coaches monitor progress across multiple dimensions: weight, workouts, nutrition, measurements, and wellbeing metrics.

### Current Status
- **Phase:** MVP Development
- **Data Layer:** Mock data (frontend-only)
- **Database:** Schema defined, not yet integrated
- **Backend:** Skeletal structure in place
- **Frontend:** Fully functional with comprehensive UI

### Key Features
- Daily check-in tracking system
- Weight and body measurement monitoring
- Workout planning and performance tracking
- Nutrition scoring and breakdown analysis
- Interactive analytics dashboard
- Progress photo uploads
- Multi-dimensional data visualization

---

## Technology Stack

### Frontend Layer
| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 18.3.1 | UI framework |
| **TypeScript** | 5.6.3 | Type safety and developer experience |
| **Vite** | 5.4.20 | Build tool and dev server |
| **Tailwind CSS** | 3.4.17 | Utility-first styling |
| **shadcn/ui** | Latest | Pre-built accessible components |
| **Wouter** | 3.5.0 | Lightweight routing |
| **TanStack React Query** | 5.60.5 | Server state management |
| **React Hook Form** | 7.55.0 | Form handling |
| **Zod** | 3.24.1 | Schema validation |
| **Recharts** | 2.15.2 | Data visualization |
| **Framer Motion** | 11.13.1 | Animations |
| **Lucide React** | 0.453.0 | Icon library |

### Backend Layer
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | Latest | JavaScript runtime |
| **Express** | 4.21.2 | Web server framework |
| **TypeScript** | 5.6.3 | Type safety |
| **tsx** | 4.19.2 | TypeScript execution |
| **esbuild** | 0.24.0 | Backend bundling |

### Database Layer
| Technology | Version | Purpose |
|-----------|---------|---------|
| **PostgreSQL** | Latest | Primary database |
| **Drizzle ORM** | 0.39.1 | Type-safe ORM |
| **Drizzle Kit** | 0.30.1 | Schema migrations |
| **Neon** | Latest | Serverless PostgreSQL |

### Authentication & Session
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Passport.js** | 0.7.0 | Authentication middleware |
| **Passport-Local** | 1.0.0 | Local auth strategy |
| **Express Session** | 1.18.1 | Session management |
| **connect-pg-simple** | 10.0.0 | PostgreSQL session store |

---

## Project Architecture

### Directory Structure

```
DawnageAIDash/
├── client/                         # Frontend React application
│   ├── src/
│   │   ├── main.tsx               # React entry point
│   │   ├── App.tsx                # Root component with routing
│   │   ├── index.css              # Global styles and CSS variables
│   │   ├── pages/                 # Page components (8 pages)
│   │   │   ├── Dashboard.tsx      # Main landing page
│   │   │   ├── CheckIns.tsx       # Daily check-in history
│   │   │   ├── Measurements.tsx   # Body measurements
│   │   │   ├── Plans.tsx          # Workout and meal plans
│   │   │   ├── Analytics.tsx      # Advanced analytics
│   │   │   ├── Media.tsx          # Progress photos
│   │   │   ├── Profile.tsx        # User profile
│   │   │   ├── Login.tsx          # Authentication
│   │   │   └── not-found.tsx      # 404 page
│   │   ├── components/            # React components
│   │   │   ├── ui/                # shadcn/ui components (49 files)
│   │   │   ├── AppSidebar.tsx     # Navigation sidebar
│   │   │   ├── MetricCard.tsx     # Reusable metric display
│   │   │   ├── CheckInForm.tsx    # Daily check-in form
│   │   │   ├── *Chart.tsx         # Various chart components
│   │   │   └── ...                # 20+ custom components
│   │   ├── hooks/                 # Custom React hooks
│   │   │   ├── use-mobile.tsx     # Responsive detection
│   │   │   └── use-toast.ts       # Toast notifications
│   │   └── lib/                   # Utilities
│   │       ├── queryClient.ts     # React Query setup
│   │       └── utils.ts           # Helper functions
│   └── index.html                 # HTML template
│
├── server/                         # Express backend
│   ├── index.ts                   # Server entry point
│   ├── routes.ts                  # API route registration
│   ├── storage.ts                 # Storage interface & implementation
│   └── vite.ts                    # Vite dev/prod server setup
│
├── shared/                         # Shared code
│   └── schema.ts                  # Database schemas and types
│
├── attached_assets/               # Static assets
│   └── dashboard_1762285477469.png # Logo
│
├── package.json                   # Project dependencies
├── tsconfig.json                  # TypeScript configuration
├── vite.config.ts                 # Vite build configuration
├── tailwind.config.ts             # Tailwind customization
├── drizzle.config.ts              # Database configuration
├── components.json                # shadcn/ui configuration
└── design_guidelines.md           # Design system documentation
```

### Application Flow

```
┌─────────────────────────────────────────────────────────────┐
│                         User Browser                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Pages      │  │  Components  │  │  React Query │      │
│  │  (Routes)    │──│  (UI Logic)  │──│  (API Layer) │      │
│  └──────────────┘  └──────────────┘  └──────┬───────┘      │
└─────────────────────────────────────────────┼───────────────┘
                                              │
                                  HTTP Requests (fetch)
                                              │
                       ┌──────────────────────▼────────────────┐
                       │    Express Server (Port 5000)         │
                       │  ┌─────────────────────────────────┐  │
                       │  │  Middleware Stack               │  │
                       │  │  • JSON Parser                  │  │
                       │  │  • Request Logger               │  │
                       │  │  • Error Handler                │  │
                       │  └─────────────────────────────────┘  │
                       │  ┌─────────────────────────────────┐  │
                       │  │  API Routes (/api/*)            │  │
                       │  │  • (Currently Empty - Template) │  │
                       │  └────────────┬────────────────────┘  │
                       │               │                        │
                       │  ┌────────────▼────────────────────┐  │
                       │  │  Storage Interface (IStorage)   │  │
                       │  │  • getUser()                    │  │
                       │  │  • getUserByUsername()          │  │
                       │  │  • createUser()                 │  │
                       │  └────────────┬────────────────────┘  │
                       └───────────────┼─────────────────────┘
                                       │
                       ┌───────────────▼─────────────────────┐
                       │   Current: MemStorage (In-Memory)   │
                       │   Future: PostgreSQL via Drizzle    │
                       └─────────────────────────────────────┘
```

---

## Database Architecture

### Current Schema (`shared/schema.ts:6-10`)

The application currently has a minimal schema with only a `users` table:

```typescript
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});
```

**Table: users**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | varchar | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique user identifier |
| username | text | NOT NULL, UNIQUE | Login username |
| password | text | NOT NULL | Hashed password |

### Validation Schema

```typescript
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
```

### Database Configuration (`drizzle.config.ts:7-14`)

```typescript
export default defineConfig({
  out: "./migrations",              // Migration files directory
  schema: "./shared/schema.ts",     // Schema source
  dialect: "postgresql",            // Database type
  dbCredentials: {
    url: process.env.DATABASE_URL,  // Connection via env variable
  },
});
```

### Required Schema Additions

To support the full application functionality shown in the UI, the following tables need to be added:

#### 1. Daily Check-Ins Table
```sql
CREATE TABLE daily_checkins (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  day_number INTEGER NOT NULL,

  -- Vitals
  morning_weight DECIMAL(5,2),
  sleep_hours DECIMAL(3,1),

  -- Workout
  workout_status VARCHAR(20), -- 'done', 'no', 'cardio_day', 'rest_day'
  workout_performance INTEGER CHECK (workout_performance BETWEEN 1 AND 10),

  -- Nutrition
  nutrition_score INTEGER CHECK (nutrition_score BETWEEN 1 AND 10),
  calorie_intake INTEGER,
  water_liters DECIMAL(3,1),
  daily_steps INTEGER,

  -- Wellbeing
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 10),
  hunger_level INTEGER CHECK (hunger_level BETWEEN 1 AND 10),
  stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 10),
  digestion VARCHAR(20), -- 'none', 'bloated', 'constipated', 'diarrhea'

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, date)
);
```

#### 2. Body Measurements Table
```sql
CREATE TABLE body_measurements (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  date DATE NOT NULL,

  weight DECIMAL(5,2),
  body_fat_percentage DECIMAL(4,2),
  muscle_mass DECIMAL(5,2),
  chest DECIMAL(5,2),
  waist DECIMAL(5,2),
  hips DECIMAL(5,2),
  thighs DECIMAL(5,2),
  arms DECIMAL(5,2),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, date)
);
```

#### 3. Workout Plans Table
```sql
CREATE TABLE workout_plans (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  day_of_week VARCHAR(10) NOT NULL, -- 'Monday', 'Tuesday', etc.
  focus VARCHAR(50),
  exercises JSONB, -- Array of exercise objects
  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, day_of_week)
);
```

#### 4. Meal Plans Table
```sql
CREATE TABLE meal_plans (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  day_of_week VARCHAR(10) NOT NULL,
  meal_type VARCHAR(20) NOT NULL, -- 'Breakfast', 'Lunch', 'Dinner', 'Snacks'
  description TEXT,
  calories INTEGER,
  protein DECIMAL(5,1),
  carbs DECIMAL(5,1),
  fats DECIMAL(5,1),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, day_of_week, meal_type)
);
```

#### 5. Progress Photos Table
```sql
CREATE TABLE progress_photos (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  photo_url TEXT NOT NULL,
  photo_type VARCHAR(20), -- 'front', 'side', 'back'
  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 6. User Goals Table
```sql
CREATE TABLE user_goals (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  goal_type VARCHAR(50) NOT NULL, -- 'weight_loss', 'muscle_gain', etc.
  target_value DECIMAL(10,2),
  current_value DECIMAL(10,2),
  start_date DATE,
  target_date DATE,
  status VARCHAR(20), -- 'active', 'completed', 'abandoned'

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Backend Deep Dive

### Server Entry Point (`server/index.ts:1-82`)

The Express server setup follows this flow:

1. **Initialize Express App** (Line 5)
2. **Configure Middleware** (Lines 12-47)
   - JSON parsing with raw body access
   - URL-encoded form parsing
   - Request logging for API routes
3. **Register Routes** (Line 50)
4. **Error Handling** (Lines 52-58)
5. **Vite Integration** (Lines 63-67)
   - Development: Vite dev server with HMR
   - Production: Serve static files
6. **Start Server** (Lines 74-80)
   - Port: 5000 (or PORT env variable)
   - Host: 0.0.0.0
   - Reuse port enabled

**Key Code Sections:**

```typescript
// Request Logger Middleware (server/index.ts:19-47)
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Intercept res.json to capture response
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Log on response finish
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});
```

### Storage Interface (`server/storage.ts:7-39`)

The application uses an interface-based storage pattern for flexibility:

```typescript
export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}
```

**Current Implementation: In-Memory Storage**

```typescript
export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
}

export const storage = new MemStorage();
```

**Future Implementation: PostgreSQL via Drizzle**

To integrate the database, the MemStorage needs to be replaced with a Drizzle-based implementation:

```typescript
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

export class DbStorage implements IStorage {
  private db;

  constructor() {
    const sql = neon(process.env.DATABASE_URL!);
    this.db = drizzle(sql);
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users)
      .where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(insertUser).returning();
    return result[0];
  }
}

export const storage = new DbStorage();
```

### API Routes (`server/routes.ts:5-15`)

Currently, the routes file is a template awaiting implementation:

```typescript
export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);

  return httpServer;
}
```

**Required API Endpoints:**

```typescript
// Daily Check-Ins
app.post('/api/check-ins', async (req, res) => { /* Create check-in */ });
app.get('/api/check-ins', async (req, res) => { /* Get user's check-ins */ });
app.get('/api/check-ins/:id', async (req, res) => { /* Get single check-in */ });
app.put('/api/check-ins/:id', async (req, res) => { /* Update check-in */ });
app.delete('/api/check-ins/:id', async (req, res) => { /* Delete check-in */ });

// Body Measurements
app.post('/api/measurements', async (req, res) => { /* Create measurement */ });
app.get('/api/measurements', async (req, res) => { /* Get measurements */ });

// Workout Plans
app.get('/api/workout-plans', async (req, res) => { /* Get workout plans */ });
app.put('/api/workout-plans/:day', async (req, res) => { /* Update plan */ });

// Meal Plans
app.get('/api/meal-plans', async (req, res) => { /* Get meal plans */ });
app.put('/api/meal-plans/:day/:meal', async (req, res) => { /* Update meal */ });

// Progress Photos
app.post('/api/photos', async (req, res) => { /* Upload photo */ });
app.get('/api/photos', async (req, res) => { /* Get photos */ });

// Analytics (derived data)
app.get('/api/analytics/trends', async (req, res) => { /* Get trend data */ });
app.get('/api/analytics/summary', async (req, res) => { /* Get summary stats */ });
```

### Vite Integration (`server/vite.ts:22-85`)

**Development Mode:**
- Sets up Vite dev server with middleware mode
- Enables HMR (Hot Module Replacement)
- Dynamically transforms index.html
- Cache-busting with nanoid for main.tsx

**Production Mode:**
- Serves pre-built static files from `dist/public`
- Falls back to index.html for client-side routing

---

## Frontend Deep Dive

### Application Root (`client/src/App.tsx:50-66`)

The App component wraps the entire application with necessary providers:

```typescript
export default function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <AppContent />
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
```

**Provider Stack:**
1. **QueryClientProvider** - TanStack React Query for server state
2. **TooltipProvider** - shadcn/ui tooltip context
3. **SidebarProvider** - Collapsible sidebar state management
4. **Toaster** - Toast notification system

### Routing System (`client/src/App.tsx:18-32`)

Uses Wouter for lightweight client-side routing:

```typescript
function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Dashboard} />
      <Route path="/check-ins" component={CheckIns} />
      <Route path="/measurements" component={Measurements} />
      <Route path="/plans" component={Plans} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/media" component={Media} />
      <Route path="/profile" component={Profile} />
      <Route component={NotFound} />
    </Switch>
  );
}
```

### React Query Configuration (`client/src/lib/queryClient.ts:44-57`)

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
```

**API Request Helper:**

```typescript
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",  // Include cookies for session
  });

  await throwIfResNotOk(res);
  return res;
}
```

### Navigation (`client/src/components/AppSidebar.tsx:14-22`)

```typescript
const menuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Check-Ins", url: "/check-ins", icon: ClipboardList },
  { title: "Measurements", url: "/measurements", icon: Ruler },
  { title: "Plans", url: "/plans", icon: Calendar },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Media", url: "/media", icon: Image },
  { title: "Profile", url: "/profile", icon: User },
];
```

---

## Data Flow Analysis

### Current Data Flow (Mock Data)

```
┌─────────────────────────────────────────────────────────────┐
│                      Page Component                          │
│  (e.g., Dashboard.tsx, CheckIns.tsx)                        │
│                                                              │
│  const weightData = [                                        │
│    { date: 'W1', weight: 82.5 },  ← MOCK DATA IN COMPONENT  │
│    { date: 'W2', weight: 81.8 },                            │
│    ...                                                       │
│  ];                                                          │
│                                                              │
│  return (                                                    │
│    <WeightChart data={weightData} />  ← PASSED AS PROPS     │
│  );                                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Props
                       ▼
┌─────────────────────────────────────────────────────────────┐
│               Chart/Display Component                        │
│               (e.g., WeightChart.tsx)                       │
│                                                              │
│  export function WeightChart({ data }: WeightChartProps) {  │
│    return (                                                  │
│      <ResponsiveContainer>                                   │
│        <LineChart data={data}>  ← RENDERS CHART             │
│          ...                                                 │
│        </LineChart>                                          │
│      </ResponsiveContainer>                                  │
│    );                                                        │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
```

**Example: Dashboard.tsx (Lines 13-22)**

```typescript
export default function Dashboard() {
  // TODO: Remove mock data - fetch from Supabase
  const weightData = [
    { date: 'W1', weight: 82.5 },
    { date: 'W2', weight: 81.8 },
    { date: 'W3', weight: 81.2 },
    { date: 'W4', weight: 80.5 },
    { date: 'W5', weight: 79.8 },
    { date: 'W6', weight: 79.2 },
    { date: 'W7', weight: 78.5 },
  ];

  // ... more mock data ...

  return (
    <div className="space-y-8">
      {/* ... */}
      <WeightChart data={weightData} />
      {/* ... */}
    </div>
  );
}
```

### Future Data Flow (Database Integration)

```
┌─────────────────────────────────────────────────────────────┐
│                      Page Component                          │
│                   (e.g., Dashboard.tsx)                     │
│                                                              │
│  // React Query hook to fetch data                          │
│  const { data: weightData, isLoading } = useQuery({         │
│    queryKey: ['/api/measurements/weight'],                  │
│  });                                                         │
│                                                              │
│  if (isLoading) return <Skeleton />;                        │
│                                                              │
│  return (                                                    │
│    <WeightChart data={weightData} />                        │
│  );                                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTP GET /api/measurements/weight
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Express Server                             │
│                   (server/routes.ts)                        │
│                                                              │
│  app.get('/api/measurements/weight', async (req, res) => {  │
│    const userId = req.session.userId;                       │
│    const data = await storage.getWeightHistory(userId);     │
│    res.json(data);                                          │
│  });                                                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Database Query
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                PostgreSQL Database                           │
│                                                              │
│  SELECT date, weight                                         │
│  FROM body_measurements                                      │
│  WHERE user_id = $1                                         │
│  ORDER BY date DESC                                          │
│  LIMIT 7;                                                    │
└─────────────────────────────────────────────────────────────┘
```

### Form Submission Flow

**Current:** (`client/src/components/CheckInForm.tsx:25-28`)

```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  console.log("Check-in submitted:", formData);  // ← Only logs to console
};
```

**Future:**

```typescript
const mutation = useMutation({
  mutationFn: async (data) => {
    const res = await apiRequest('POST', '/api/check-ins', data);
    return res.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/check-ins'] });
    toast({ title: "Check-in saved successfully!" });
  },
});

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  mutation.mutate(formData);
};
```

---

## Component Catalog

### Page Components

#### 1. Dashboard (`client/src/pages/Dashboard.tsx`)
**Purpose:** Main landing page with comprehensive overview
**Data Points:**
- Current weight, workout count, nutrition score, energy level
- Weight trend chart (7 weeks)
- Performance chart (7 days)
- Workout heatmap (28 days)
- Nutrition breakdown (macros)
- Weekly comparison (4 weeks)
- Progress bars (steps, nutrition, workouts, sleep)

**Mock Data:**
- Lines 14-74: weightData, performanceData, weeklyComparisonData, heatmapData

#### 2. Check-Ins (`client/src/pages/CheckIns.tsx`)
**Purpose:** Daily check-in history and trends
**Data Points:**
- Check-in history (7 recent entries)
- Trend charts (weight, nutrition, performance, energy, stress, sleep, steps, water)
- Average metrics (nutrition score, performance, consistency rate, weight lost)

**Mock Data:**
- Lines 8-76: checkInHistory, trendData

#### 3. Measurements (`client/src/pages/Measurements.tsx`)
**Purpose:** Body composition tracking
**Components:**
- MeasurementCard
- MeasurementComparisonCard
- MeasurementProgressChart

#### 4. Plans (`client/src/pages/Plans.tsx`)
**Purpose:** Workout and meal plan management
**Components:**
- EditableWorkoutPlan
- EditableMealPlan

#### 5. Analytics (`client/src/pages/Analytics.tsx`)
**Purpose:** Advanced analytics and insights
**Components:**
- BodyCompositionRadar
- GoalProgressCard
- InteractiveMetricsGrid
- Various trend charts

#### 6. Media (`client/src/pages/Media.tsx`)
**Purpose:** Progress photo uploads
**Components:**
- PhotoUpload

#### 7. Profile (`client/src/pages/Profile.tsx`)
**Purpose:** User profile and settings

#### 8. Login (`client/src/pages/Login.tsx`)
**Purpose:** Authentication entry point

### Chart Components

#### WeightChart (`client/src/components/WeightChart.tsx:13-53`)
**Props:**
```typescript
interface WeightDataPoint {
  date: string;
  weight: number;
}
interface WeightChartProps {
  data: WeightDataPoint[];
}
```
**Visualization:** Line chart using Recharts
**Features:**
- Responsive container
- Cartesian grid
- Custom tooltip styling
- Dynamic Y-axis domain

#### PerformanceChart
**Data:** Daily performance, nutrition, energy scores (1-10 scale)
**Type:** Multi-line chart

#### NutritionBreakdownChart
**Data:** Protein, carbs, fats (grams)
**Type:** Pie chart with percentages

#### WorkoutHeatmap
**Data:** Daily workout status and intensity
**Type:** Calendar heatmap
**Statuses:** 'done', 'rest', 'missed', 'cardio_day'

#### CheckInTrendsChart
**Data:** Multi-dimensional trends over time
**Type:** Multi-line chart
**Metrics:** Weight, nutrition, performance, energy, stress, sleep, steps, water

### Display Components

#### MetricCard (`client/src/components/MetricCard.tsx:16-41`)
**Props:**
```typescript
interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
}
```
**Features:**
- Large value display
- Icon indicator
- Optional trend indicator with percentage
- Optional subtitle
- Hover elevation effect

#### DailyCheckInCard
**Purpose:** Display comprehensive check-in data for a single day
**Sections:** Vitals, workout, nutrition, wellbeing

### Form Components

#### CheckInForm (`client/src/components/CheckInForm.tsx:9-237`)
**State:**
```typescript
{
  morningWeight: string,
  workoutStatus: string,
  workoutPerformance: string,
  nutritionScore: string,
  dailySteps: string,
  sleepHours: string,
  waterLiters: string,
  energyLevel: string,
  digestion: string,
  hungerLevel: string,
  stressLevel: string,
  calorieIntake: string,
}
```

**Sections:**
1. **Vitals:** Morning weight, sleep hours
2. **Workout:** Status (done/no/cardio/rest), performance (1-10)
3. **Nutrition:** Score (1-10), calories, water (L), steps
4. **Wellbeing:** Energy (1-10), hunger (1-10), stress (1-10), digestion

**Current Submission:** Console log only
**Required:** POST to /api/check-ins

---

## Current State & Integration Points

### What Works Today

1. **Complete UI/UX**
   - All pages render correctly
   - Navigation works seamlessly
   - Charts display mock data beautifully
   - Forms collect user input
   - Responsive design across devices

2. **Frontend Architecture**
   - React component hierarchy established
   - Routing configured and functional
   - State management via React Query ready
   - Form validation with React Hook Form + Zod

3. **Backend Infrastructure**
   - Express server running on port 5000
   - Development HMR via Vite
   - Production static serving ready
   - Request logging middleware active
   - Error handling in place

4. **Database Foundation**
   - Schema defined for users table
   - Drizzle ORM configured
   - Migration setup ready
   - Neon PostgreSQL connection configured

### What Needs Implementation

#### 1. Database Integration

**Step 1: Expand Schema**
Add tables to `shared/schema.ts`:
- daily_checkins
- body_measurements
- workout_plans
- meal_plans
- progress_photos
- user_goals

**Step 2: Run Migrations**
```bash
npm run db:push
```

**Step 3: Replace MemStorage**
Update `server/storage.ts` to use Drizzle instead of in-memory Map.

#### 2. API Endpoints

**Step 1: Implement Routes**
Add CRUD endpoints to `server/routes.ts` for each entity.

**Step 2: Add Authentication**
Implement Passport.js session-based auth:
```typescript
app.post('/api/auth/login', passport.authenticate('local'), (req, res) => {
  res.json({ user: req.user });
});

app.post('/api/auth/logout', (req, res) => {
  req.logout();
  res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
  res.json({ user: req.user });
});
```

**Step 3: Protect Routes**
Add authentication middleware:
```typescript
const requireAuth = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

app.use('/api/*', requireAuth); // Except /api/auth/*
```

#### 3. Frontend Data Fetching

**Pattern to Replace Mock Data:**

Before:
```typescript
const weightData = [
  { date: 'W1', weight: 82.5 },
  // ...
];
```

After:
```typescript
const { data: weightData, isLoading, error } = useQuery({
  queryKey: ['/api/measurements/weight'],
});

if (isLoading) return <Skeleton />;
if (error) return <ErrorMessage error={error} />;
```

**Files to Update:**
- `client/src/pages/Dashboard.tsx`
- `client/src/pages/CheckIns.tsx`
- `client/src/pages/Measurements.tsx`
- `client/src/pages/Plans.tsx`
- `client/src/pages/Analytics.tsx`
- `client/src/pages/Media.tsx`

Each file has TODO comments marking mock data locations.

#### 4. Form Submissions

**Pattern to Implement:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const CheckInForm = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (data) => {
      const res = await apiRequest('POST', '/api/check-ins', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/check-ins'] });
      toast({
        title: "Success!",
        description: "Check-in saved successfully.",
      });
      setFormData(initialState); // Reset form
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  // ...
};
```

#### 5. File Upload (Progress Photos)

**Backend:**
```typescript
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/photos/upload', upload.single('photo'), async (req, res) => {
  const file = req.file;
  const userId = req.session.userId;

  // Upload to S3 or similar
  const key = `users/${userId}/${Date.now()}-${file.originalname}`;
  // ... S3 upload logic ...

  // Save URL to database
  const photo = await storage.createProgressPhoto({
    userId,
    photoUrl: url,
    date: new Date(),
    photoType: req.body.type,
  });

  res.json(photo);
});
```

---

## Development Workflow

### Environment Setup

1. **Install Dependencies**
```bash
npm install
```

2. **Set Environment Variables**
Create `.env` file:
```
DATABASE_URL=postgresql://user:password@host:5432/dawnage_db
SESSION_SECRET=your-secret-key-here
PORT=5000
```

3. **Initialize Database**
```bash
npm run db:push
```

### Development Commands

```bash
# Start development server with HMR
npm run dev

# Type checking
npm run check

# Build for production
npm run build

# Run production server
npm start

# Push database schema changes
npm run db:push
```

### Development Server

**URL:** http://localhost:5000
**API Base:** http://localhost:5000/api

The development server:
- Runs Express on port 5000
- Vite dev server with HMR integrated
- API requests logged to console
- Auto-reloads on file changes

### File Watching

Vite watches:
- `client/**/*`
- `shared/**/*`

tsx watches:
- `server/**/*`

### Production Build

1. **Frontend Build** (Vite)
   - Output: `dist/public/`
   - Minified, optimized bundle
   - CSS extracted

2. **Backend Build** (esbuild)
   - Output: `dist/index.js`
   - Bundled server code

3. **Static Assets**
   - Copied to `dist/public/assets/`

---

## Future Enhancement Roadmap

### Phase 1: Core Database Integration (Week 1-2)
- [ ] Expand schema with all required tables
- [ ] Run migrations
- [ ] Replace MemStorage with DbStorage
- [ ] Implement basic CRUD endpoints
- [ ] Add authentication flow

### Phase 2: Data Integration (Week 3-4)
- [ ] Replace all mock data with API calls
- [ ] Implement form submissions
- [ ] Add error handling and loading states
- [ ] Implement data validation

### Phase 3: Advanced Features (Week 5-6)
- [ ] Progress photo uploads with S3
- [ ] Real-time analytics calculations
- [ ] Goal tracking system
- [ ] Notification system
- [ ] Export data functionality

### Phase 4: AI Integration (Week 7-8)
- [ ] AI-powered nutrition recommendations
- [ ] Workout plan optimization
- [ ] Trend predictions
- [ ] Personalized insights

### Phase 5: Polish & Optimization (Week 9-10)
- [ ] Performance optimization
- [ ] Accessibility improvements
- [ ] Mobile app (React Native)
- [ ] Advanced charts and visualizations

---

## Key Insights & Recommendations

### Architecture Strengths
1. **Clear separation of concerns** - Frontend, backend, shared code well organized
2. **Type safety** - TypeScript throughout the stack
3. **Scalable patterns** - React Query for data, modular components
4. **Modern tooling** - Vite, Drizzle, shadcn/ui

### Areas for Improvement
1. **Missing data layer** - Currently no real persistence
2. **No authentication** - Passport configured but not integrated
3. **Mock data everywhere** - All pages use hardcoded data
4. **No error boundaries** - Need better error handling
5. **Missing tests** - No test suite yet

### Integration Priority
1. **Highest:** Daily check-ins (most critical user flow)
2. **High:** Authentication and user sessions
3. **Medium:** Measurements and plans
4. **Low:** Analytics (can be calculated from existing data)

### Data Model Notes
- Consider soft deletes for user data
- Add timestamps to all tables (created_at, updated_at)
- Use UUIDs for all primary keys (already configured)
- Consider adding indexes on user_id and date fields
- Implement cascading deletes on user deletion

---

## Quick Reference

### Important File Paths
- **Database Schema:** `/shared/schema.ts`
- **Server Entry:** `/server/index.ts`
- **API Routes:** `/server/routes.ts`
- **Storage Interface:** `/server/storage.ts`
- **Frontend Entry:** `/client/src/main.tsx`
- **App Root:** `/client/src/App.tsx`
- **API Client:** `/client/src/lib/queryClient.ts`

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `PORT` - Server port (default: 5000)

### Key Commands
- `npm run dev` - Start development
- `npm run db:push` - Update database schema
- `npm run build` - Build for production
- `npm start` - Run production server

---

**End of Document**
