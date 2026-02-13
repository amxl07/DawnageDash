# DawnageAIDash - Codebase Reference Guide

**Last Updated:** February 13, 2026
**Current Branch:** main
**Latest Commit:** f278e07 - "Added Training and Nutrition Plans"

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [User Roles & Authentication](#user-roles--authentication)
5. [Database Schema](#database-schema)
6. [Key Pages & Routes](#key-pages--routes)
7. [Core Components](#core-components)
8. [Business Logic & Workflows](#business-logic--workflows)
9. [API Structure](#api-structure)
10. [Recent Development](#recent-development)
11. [Environment Variables](#environment-variables)
12. [Development Commands](#development-commands)

---

## Project Overview

**DawnageAIDash** is a full-stack fitness & wellness coaching platform that connects coaches with clients through data-driven tracking and personalized planning.

### Core Purpose
- **Client Management** - Coaches manage multiple clients with package assignments
- **Progress Tracking** - Daily check-ins for workout, nutrition, and wellness metrics
- **Personalized Planning** - Hierarchical workout and meal plan selection
- **Data Analytics** - Visual progress through charts and performance metrics
- **Coach-Client Communication** - Coaches monitor client data and provide feedback

### Project Structure
```
DawnageAIDash/
├── client/              # React frontend (Vite)
│   ├── src/
│   │   ├── pages/       # 12 main pages (4,191 lines)
│   │   ├── components/  # 43+ reusable components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/         # Utilities (coach-utils, supabase)
│   │   └── contexts/    # Auth context
│   └── index.html
├── server/              # Express.js backend
│   ├── index.ts         # Main server setup
│   ├── routes.ts        # Route registration (minimal)
│   └── vite.ts          # Vite dev integration
├── shared/              # Shared types & schema
│   └── schema.ts        # Drizzle ORM schema (13 tables)
├── sqlmigrationfiles/   # Database migrations
└── attached_assets/     # Static assets
```

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 | UI framework |
| Vite | 5.4.20 | Build tool |
| Wouter | 3.3.5 | Lightweight routing |
| Radix UI | Latest | Accessible UI components |
| Tailwind CSS | 3.4.17 | Styling |
| React Hook Form | 7.55.0 | Form management |
| Zod | 3.24.2 | Schema validation |
| TanStack Query | 5.60.5 | Data fetching/caching |
| Recharts | 2.15.2 | Data visualization |
| Lucide React | 0.453.0 | Icons |
| Date-fns | 3.6.0 | Date utilities |
| Framer Motion | 11.13.1 | Animations |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Express | 4.21.2 | Web server |
| Drizzle ORM | 0.39.1 | Database ORM |
| PostgreSQL | Latest | Database (via Supabase) |
| Supabase Auth | Latest | Authentication |
| Express Session | 1.18.1 | Session management |
| ws | 8.18.0 | WebSockets |

### Development
- **TypeScript** 5.6.3
- **tsx** 4.20.5 - TypeScript execution
- **esbuild** 0.25.0 - Fast bundling
- **Drizzle Kit** 0.31.4 - Schema management

---

## Architecture

### Data Flow
```
React Client → Supabase JS SDK → PostgreSQL (with RLS Policies)
     ↓
Auth Context → Protected Routes → Components
     ↓
TanStack Query → Cache → UI Updates
```

### Authentication Flow
1. Signup/Login via Supabase Auth (email/password)
2. Role stored in `user_metadata` (client or coach)
3. Express session + Supabase token management
4. React Context provides auth state to app
5. Row-Level Security (RLS) policies enforce data access

### Current Architecture Notes
- **Mostly client-side** - Direct Supabase queries from React
- **Minimal REST API** - Server routes exist but are mostly unused
- **RLS-based security** - PostgreSQL policies control data access
- **No dedicated API layer** - Could be added in future for complex operations

---

## User Roles & Authentication

### Client Role (`role: 'client'`)
**Capabilities:**
- Complete daily check-ins (vitals, nutrition, workout, wellness)
- Track body measurements
- Upload progress photos
- View personalized workout & meal plans
- Submit weekly feedback (5-step questionnaire)
- View analytics dashboard with charts
- Manage profile and preferences

**Dashboard Metrics:**
- Current weight & trend
- Check-in compliance
- Workout performance
- Nutrition scores
- Weekly comparisons

### Coach Role (`role: 'coach'`)
**Capabilities:**
- View all assigned clients
- Claim unassigned clients with package assignment
- Monitor client compliance (30-day check-in %)
- Track red flags (5+ consecutive missed check-ins)
- View client weekly feedback
- Access detailed client analytics
- Edit package dates and details

**Coach Dashboard Features:**
- Client table with compliance metrics
- Red flag alerts for at-risk clients
- Package progress tracking
- Client detail sheets with full history
- Weekly feedback review

### Authorization Rules (RLS Policies)
```sql
-- Clients view only their own data
CREATE POLICY "Users can view their own data"
    ON table_name FOR SELECT
    USING (auth.uid() = user_id);

-- Coaches view assigned clients' data
CREATE POLICY "Coaches can view assigned clients"
    ON table_name FOR SELECT
    USING (auth.uid() IN (
        SELECT coach_id FROM users WHERE id = table_name.user_id
    ));
```

### Coach View Feature
- `viewedUserId` in sessionStorage
- Coaches switch between "My Clients" view and individual client views
- Dynamic sidebar based on coach status
- Maintains coach context while viewing client data

---

## Database Schema

### 13 Core Tables

#### 1. **users** (Primary)
```typescript
{
  id: uuid (auth.users FK),
  email: string,
  role: 'client' | 'coach',
  coachId: uuid (self-referential),
  packageType: 'basic' | 'intermediate' | 'premium',
  packageDuration: number (months),
  packageStartDate: timestamp,
  activeWorkoutPlan: json,
  activeMealPlan: json,
  phone: string,
  countryCode: string,
  avatar: string,
  trainingNote: text,
  supplementsNote: text
}
```

#### 2. **daily_check_ins**
```typescript
{
  id: serial,
  userId: uuid,
  date: date,
  // Vitals
  weight: decimal,
  sleepHours: decimal,
  // Workout
  workoutDone: 'done' | 'no' | 'cardio_day' | 'rest_day',
  workoutPerformance: 1-10,
  // Nutrition
  nutritionScore: 1-10,
  caloriesConsumed: integer,
  proteinGrams: decimal,
  carbsGrams: decimal,
  fatsGrams: decimal,
  waterIntakeLiters: decimal,
  stepsCount: integer,
  // Wellness
  energyLevel: 1-10,
  hungerLevel: 'low' | 'medium' | 'high',
  stressLevel: 'low' | 'medium' | 'high',
  digestion: 'none' | 'bloated' | 'constipated' | 'diarrhea',
  notes: text
}
```

#### 3. **body_measurements**
```typescript
{
  id: serial,
  userId: uuid,
  date: date,
  chest: decimal,
  waist: decimal,
  hips: decimal,
  leftThigh: decimal,
  rightThigh: decimal,
  leftArm: decimal,
  rightArm: decimal
}
```

#### 4. **workout_plans** (User-specific)
```typescript
{
  id: serial,
  userId: uuid,
  level: 'beginner' | 'intermediate' | 'advanced',
  workoutType: 'GYM_WORKOUT' | 'HOME_WORKOUT' | 'ADVANCE_CALISTHENICS' |
               'POWERBUILDING' | 'CALIS_COMPOUND_LIFTS' | 'ASSESSMENT',
  subCategory: string,
  daysPerWeek: 3 | 4 | 5 | 6,
  dayNumber: integer,
  focusArea: string,
  exercises: json,
  notes: text,
  videoLink: string
}
```

#### 5. **workout_templates** (Global)
Same structure as workout_plans but without userId - master templates

#### 6. **meal_plans** (User-specific)
```typescript
{
  id: serial,
  userId: uuid,
  dietType: 'vegetarian' | 'eggetarian' | 'non-vegetarian',
  caloriesTarget: 1200 | 1500 | 1800 | 2000 | 2200 | 2500 | 2800,
  breakfast: json,
  lunch: json,
  dinner: json,
  snacks: json
}
```

#### 7. **meal_templates** (Global)
Same structure as meal_plans but without userId - master templates

#### 8. **weekly_check_ins**
```typescript
{
  id: serial,
  userId: uuid,
  weekStartDate: date,
  // Step 1: General
  overallFeeling: text,
  weeklyWins: text,
  // Step 2: Nutrition
  nutritionAdherence: text,
  digestionFeedback: text,
  mealSatisfaction: text,
  nutritionQuestions: text,
  // Step 3: Training
  trainingProgress: text,
  trainingEnjoyment: text,
  missedSessions: text,
  jointPain: text,
  stepCount: text,
  // Step 4: Wellbeing
  recoveryQuality: text,
  waterIntake: text,
  stressLevel: text,
  // Step 5: Summary
  overallExperience: text,
  openFeedback: text
}
```

#### 9. **progress_photos**
```typescript
{
  id: serial,
  userId: uuid,
  photoUrl: string,
  uploadDate: timestamp,
  dietType: string,
  caloriesTarget: integer
}
```

#### 10. **weekly_progress_photos**
```typescript
{
  id: serial,
  userId: uuid,
  weekNumber: integer,
  frontPhotoUrl: string,
  backPhotoUrl: string,
  sideLeftPhotoUrl: string,
  sideRightPhotoUrl: string,
  uploadDate: timestamp
}
```

#### 11. **workout_logs**
```typescript
{
  id: serial,
  userId: uuid,
  date: date,
  content: json,
  createdAt: timestamp
}
```

#### 12. **user_goals**
```typescript
{
  id: serial,
  userId: uuid,
  goalType: string,
  targetValue: decimal,
  currentValue: decimal,
  startDate: date,
  targetDate: date
}
```

#### 13. **onboarding_questionnaire**
```typescript
{
  id: serial,
  userId: uuid,
  answers: json,
  completedAt: timestamp
}
```

### Key Relationships
```
users.coachId → users.id (self-referential)
All other tables → users.id via userId foreign key
```

---

## Key Pages & Routes

### Client Pages (12 Total)

| Route | File | Lines | Purpose |
|-------|------|-------|---------|
| `/` | Dashboard.tsx | 335 | Main overview with metrics, charts, trends |
| `/checkins` | CheckIns.tsx | 253 | Daily check-in form with all vitals |
| `/measurements` | Measurements.tsx | 237 | Body composition tracking |
| `/plans` | Plans.tsx | 893 | Workout/meal plan selection & management |
| `/workout-logs` | WorkoutLogs.tsx | 454 | Log individual workout sessions |
| `/weekly-feedback` | WeeklyFeedback.tsx | 467 | 5-step weekly questionnaire |
| `/media` | Media.tsx | 183 | Progress photo gallery |
| `/profile` | Profile.tsx | 325 | User profile, package info, preferences |
| `/login` | Login.tsx | 514 | Auth UI with role selection |
| `/signup` | Signup.tsx | - | User registration |
| `/onboarding` | OnboardingFlow.tsx | - | New user questionnaire wizard |

### Coach Pages (New - Feb 2026)

| Route | File | Lines | Purpose |
|-------|------|-------|---------|
| `/coach/clients` | CoachClientsPage.tsx | 334 | Client management dashboard |
| `/coach/claim` | CoachClaimPage.tsx | 175 | Claim unassigned clients |

### Routing Implementation
- **Library:** Wouter (lightweight alternative to React Router)
- **Pattern:** `<Route path="..." component={Component} />`
- **Protection:** `<ProtectedRoute>` wrapper for authenticated routes
- **Coach Detection:** Routes adapt based on `user?.user_metadata?.role === 'coach'`

---

## Core Components

### 43+ Components Organized by Category

#### Navigation & Layout
- **AppSidebar** - Client navigation with collapsible menu
- **CoachSidebar** - Coach-specific navigation (My Clients, Claim Clients)
- **ProtectedRoute** - Authentication wrapper for routes

#### Forms & Data Entry
- **CheckInForm** - Daily check-in capture
- **CheckInDialog** - Modal version of check-in form
- **MeasurementDialog** - Body measurements entry
- **OnboardingFlow** - Multi-step onboarding wizard
- **QuestionnaireWizard** - Generic wizard component
- **PhotoUpload** - Single photo upload
- **PhotosUploadDialog** - Multi-angle photo upload (4 angles)

#### Coach-Specific Components
- **CoachClientTable** - Table of assigned clients with metrics
- **ClientDetailsSheet** - Detailed client view in side sheet
- **ClientWeeklyFeedbackView** - Coach view of client feedback
- **PackageSelectDialog** - Assign/edit packages for clients

#### Data Visualization
- **WeightChart** - Weight trend line with trendline
- **PerformanceChart** - Workout performance over time
- **NutritionBreakdownChart** - Macro distribution pie/bar chart
- **WeeklyComparisonChart** - Week-over-week metric comparison
- **WorkoutHeatmap** - Workout frequency calendar heatmap
- **CheckInTrendsChart** - Check-in compliance visualization
- **BodyCompositionRadar** - Radar chart for measurements
- **InteractiveMetricsGrid** - Flexible metric card display

#### Training & Nutrition
- **WorkoutPlan** - Display workout plan details
- **EditableWorkoutPlan** - Edit workout plan (coach/admin)
- **MealPlan** - Display meal plan with macros
- **EditableMealPlan** - Edit meal plan
- **TrainingNote** - Special training notes with video links
- **ExerciseCard** - Individual exercise display
- **MealCard** - Individual meal display with ingredients

#### UI Utilities
- **VideoDialog** - Modal for embedded video playback
- **WhatsAppActivationCard** - WhatsApp integration prompt
- **DateRangePicker** - Date range selection
- **MetricCard** - Reusable metric display card
- **TrendIndicator** - Up/down/neutral trend arrow

#### Radix UI Components (via shadcn/ui pattern)
- Button, Card, Dialog, Sheet, Tabs, Select, Input, Label
- Accordion, Alert, Badge, Checkbox, RadioGroup
- Tooltip, Popover, Separator, Progress, Avatar
- Command, Calendar, ScrollArea, Skeleton

---

## Business Logic & Workflows

### 1. Client Onboarding Workflow
```
User Registration → Role Selection → Onboarding Questionnaire
    ↓
Coach Assignment (optional) → Package Setup → First Check-in
    ↓
Dashboard Access → Daily Tracking Begins
```

**Steps:**
1. Create account with email/password
2. Select role (Client or Coach)
3. Complete multi-section questionnaire
4. Get assigned to coach OR proceed independently
5. Activate with first check-in
6. Access full dashboard

### 2. Coach-Client Assignment
```
Unassigned Client (coachId = null)
    ↓
Coach Views "Claim Clients" Page → Selects Client
    ↓
Choose Package Type & Duration → Set Start Date
    ↓
Submit → Welcome Email Sent → Client Assigned
```

**Package Options:**
- **Basic** - 3 months
- **Intermediate** - 6 months
- **Premium** - Custom duration

### 3. Daily Client Tracking Loop
```
Wake Up → Morning Weigh-in
    ↓
Complete Daily Check-in:
  - Weight & Sleep
  - Workout Status & Performance
  - Nutrition Score & Macros
  - Energy, Hunger, Stress, Digestion
  - Optional Notes
    ↓
Dashboard Updates → Charts Refresh → Trends Calculate
    ↓
Weekly → Submit Feedback (5 steps) → Coach Reviews
```

### 4. Workout Plan Hierarchy
```
Level Selection
  ├─ Beginner
  ├─ Intermediate
  └─ Advanced
      ↓
Workout Type Selection
  ├─ GYM_WORKOUT
  ├─ HOME_WORKOUT
  ├─ ADVANCE_CALISTHENICS
  ├─ POWERBUILDING
  ├─ CALIS_COMPOUND_LIFTS
  └─ ASSESSMENT
      ↓
Sub-Category Selection
  ├─ 0_EXPERIENCE
  ├─ JUST_BODYWEIGHT
  ├─ LIGHT_DUMBBELLS
  └─ [varies by type]
      ↓
Days Per Week Selection
  ├─ 3 days
  ├─ 4 days
  ├─ 5 days
  └─ 6 days
      ↓
Individual Day Plans
  - Exercises with sets/reps
  - Focus area
  - Video links
  - Notes
```

**Example Path:**
`Beginner → GYM_WORKOUT → 0_EXPERIENCE → 4 days/week → Day 1-4 plans`

### 5. Meal Plan Selection
```
Calories Target Selection
  ├─ 1200 kcal
  ├─ 1500 kcal
  ├─ 1800 kcal
  ├─ 2000 kcal
  ├─ 2200 kcal
  ├─ 2500 kcal
  └─ 2800 kcal
      ↓
Diet Type Selection
  ├─ Vegetarian
  ├─ Eggetarian
  └─ Non-Vegetarian
      ↓
Full Day Meal Plan
  ├─ Breakfast (with macros)
  ├─ Lunch (with macros)
  ├─ Dinner (with macros)
  └─ Snacks (with macros)
```

### 6. Weekly Feedback (5-Step Process)
```
Step 1: General Overview
  - Overall feeling this week
  - Weekly wins

Step 2: Nutrition
  - Adherence level
  - Digestion feedback
  - Meal satisfaction
  - Questions for coach

Step 3: Training
  - Progress notes
  - Enjoyment level
  - Missed sessions
  - Joint pain
  - Step count

Step 4: Wellbeing
  - Recovery quality
  - Water intake
  - Stress level

Step 5: Summary
  - Overall experience
  - Open feedback for coach
```

### 7. Coach Monitoring Loop
```
Coach Dashboard → View Client List
    ↓
Monitor Compliance Metrics:
  - 30-day check-in %
  - Red flag alerts (5+ missed days)
  - Package progress %
  - Weekly feedback status
    ↓
Click Client → View Details Sheet:
  - Full check-in history
  - Body measurements
  - Weekly feedback
  - Progress photos
  - Analytics
    ↓
Provide Feedback → Client Receives Notification
```

### 8. Compliance Calculation Logic
**Location:** `client/src/lib/coach-utils.ts`

```typescript
// 30-day compliance
calculateCompliance(checkIns, days = 30)
  → Count check-ins in last N days / N × 100

// Red flag detection
checkRedFlag(checkIns)
  → Sort by date DESC
  → Find 5+ consecutive days without check-in
  → Return true if found

// Package progress
calculatePackageProgress(startDate, durationMonths)
  → Days elapsed / Total days × 100

// Overall consistency (lifetime)
calculateOverallConsistency(checkIns, userCreatedDate)
  → Total check-ins / Days since signup × 100

// Average nutrition (7-day rolling)
calculateAverageNutrition(checkIns)
  → Last 7 check-ins with nutrition scores
  → Average score
```

---

## API Structure

### Current Status: Minimal API

**Backend Implementation:**
- `server/routes.ts` - 15 lines, empty route registration
- `server/index.ts` - Express setup, middleware, error handling
- **No dedicated REST API endpoints**

### Data Access Pattern
```
React Component
    ↓
Supabase JS Client
    ↓
PostgreSQL with RLS Policies
    ↓
Data returned to component
```

### Missing API Endpoints (Future Enhancement)
These operations currently happen client-side but could benefit from server endpoints:

```typescript
// Potential future endpoints
POST   /api/clients/claim
  → Assign coach to client with package

GET    /api/clients/:id/compliance
  → Calculate and cache compliance metrics

POST   /api/weekly-feedback
  → Submit feedback with notifications

GET    /api/coaching-insights/:clientId
  → Aggregate analytics data

PUT    /api/packages/:clientId
  → Update package with validation

POST   /api/workout-plans/generate
  → AI-powered plan generation

GET    /api/dashboard/:userId
  → Pre-calculated dashboard metrics
```

### Current Workaround
- All CRUD operations via Supabase client SDK
- Business logic in React components or utility functions
- RLS policies enforce security at database level

---

## Recent Development

### Latest Commits (Last 5)
1. **f278e07** - Added Training and Nutrition Plans
2. **b4ac818** - Added Edit package date, Weekly feedback view, date fixes
3. **33f2636** - Added Alternate workout Note and video link section
4. **a133f08** - Added WORKOUT ASSESSMENT PLAN
5. **538e4b1** - Added Fix to signup and edit phone number

### Coach Feature Development (Feb 12-13, 2026)

#### New Files Created
```
client/src/pages/CoachClientsPage.tsx          334 lines
client/src/pages/CoachClaimPage.tsx            175 lines
client/src/components/CoachClientTable.tsx     ~800 lines
client/src/components/ClientDetailsSheet.tsx   New
client/src/components/CoachSidebar.tsx         ~150 lines
client/src/lib/coach-utils.ts                  ~400 lines
```

#### Modified Files
```
client/src/App.tsx                    # Added coach routing
client/src/pages/CoachDashboard.tsx   # Deleted (replaced by CoachClientsPage)
```

#### Database Migrations Added
```sql
add_training_notes_to_users.sql
add_supplements_note_to_users.sql
add_coach_weekly_checkins_policy.sql
insert_assessment_plan.sql
```

### New Coach Features Implemented

#### 1. Client Management Dashboard
**File:** `CoachClientsPage.tsx`

Features:
- View all assigned clients in table format
- Real-time compliance metrics per client
- Red flag alerts for at-risk clients
- Quick access to client details
- Package progress visualization

Metrics Displayed:
- Client name & email
- Package type (Basic/Intermediate/Premium)
- 30-day compliance percentage
- Red flag status (5+ consecutive missed days)
- Last check-in date
- Weekly feedback submission status

#### 2. Client Claiming System
**File:** `CoachClaimPage.tsx`

Features:
- View unassigned clients (coachId = null)
- Select package type and duration
- Set package start date
- One-click claim assignment
- Auto-send welcome email via Supabase Function

Workflow:
```
Fetch clients where coachId IS NULL
    ↓
Display in searchable/filterable table
    ↓
Coach selects client → Opens package dialog
    ↓
Choose: Basic (3mo) | Intermediate (6mo) | Premium (custom)
    ↓
Set start date → Submit
    ↓
Update user.coachId, packageType, packageDuration, packageStartDate
    ↓
Trigger welcome email → Success notification
```

#### 3. Compliance Monitoring
**File:** `coach-utils.ts`

**Functions Added:**
```typescript
calculateCompliance(checkIns, days = 30): number
  // Returns percentage of days with check-ins

checkRedFlag(checkIns): boolean
  // Returns true if 5+ consecutive days missed

calculatePackageProgress(startDate, duration): number
  // Returns % of package duration elapsed

getComplianceColor(percentage): string
  // Returns color class based on compliance level
  // >80% = green, 50-80% = yellow, <50% = red

checkWeeklyReviewStatus(reviews, weekStart): boolean
  // Returns true if feedback submitted for week

calculateOverallConsistency(checkIns, createdAt): number
  // Lifetime compliance percentage

calculateAverageNutrition(checkIns, days = 7): number
  // Rolling average nutrition score
```

**Color Coding:**
- 🟢 Green: 80-100% compliance (excellent)
- 🟡 Yellow: 50-79% compliance (needs attention)
- 🔴 Red: 0-49% compliance (at risk)
- 🚩 Red Flag: 5+ consecutive missed days

#### 4. Client Details Sheet
**File:** `ClientDetailsSheet.tsx`

Features:
- Slide-out side panel with full client view
- Tabbed interface for different data types
- Weekly feedback history
- Body measurement trends
- Progress photo gallery
- Package management (edit dates/type)

Tabs:
1. Overview - Summary metrics
2. Check-ins - Daily check-in history
3. Feedback - Weekly submissions
4. Measurements - Body composition
5. Photos - Progress images
6. Package - Edit package details

#### 5. Coach Sidebar
**File:** `CoachSidebar.tsx`

Navigation Items:
- 📊 My Clients - Main client dashboard
- ➕ Claim Clients - Assign unassigned clients
- (Future: Analytics, Settings, etc.)

### Database Changes

#### New RLS Policy for Coach Access
```sql
-- Allow coaches to view assigned clients' weekly check-ins
CREATE POLICY "Coaches can view assigned clients' weekly_check_ins"
ON weekly_check_ins
FOR SELECT
USING (
  auth.uid() IN (
    SELECT coach_id
    FROM users
    WHERE id = weekly_check_ins.user_id
  )
);
```

#### New User Fields
```typescript
users {
  trainingNote: text,      // Special training instructions
  supplementsNote: text    // Supplement recommendations
}
```

#### New Workout Type
```typescript
workoutType enum += 'ASSESSMENT'
// For initial fitness assessment plans
```

---

## Environment Variables

### Required Environment Variables

**Client (.env or Vite config):**
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**Server (.env):**
```bash
DATABASE_URL=postgresql://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SESSION_SECRET=random-secret-string
PORT=5000
```

### Optional Variables
```bash
# WhatsApp Integration
VITE_WHATSAPP_ACTIVATION_URL=https://wa.me/...

# Node Environment
NODE_ENV=development|production
```

### Supabase Configuration
- **URL:** Project URL from Supabase dashboard
- **Anon Key:** Public key for client-side access
- **Service Role Key:** Full access key for server-side operations (NEVER expose to client)

---

## Development Commands

### Package Management
```bash
npm install              # Install all dependencies
npm run check           # Type checking only
```

### Development
```bash
npm run dev             # Start development server
                        # - Runs tsx on server/index.ts
                        # - Vite dev server for client
                        # - Hot reload enabled
                        # - Typically runs on http://localhost:5000
```

### Production Build
```bash
npm run build           # Build for production
                        # - Vite builds client to dist/public
                        # - esbuild bundles server to dist/index.js

npm start               # Run production build
                        # - Serves built files from dist/
```

### Database
```bash
npm run db:push         # Push schema changes to database
                        # - Uses Drizzle Kit
                        # - Applies migrations from shared/schema.ts

npm run db:studio       # Open Drizzle Studio
                        # - Visual database explorer
                        # - Run queries, edit data
                        # - Typically runs on http://localhost:4983
```

### Type Generation
```bash
npm run db:generate     # Generate Drizzle types from schema
                        # - Creates TypeScript types
                        # - Generates Zod schemas
```

### Build Details
- **Client Build:** Vite → `dist/public/`
- **Server Build:** esbuild → `dist/index.js`
- **Asset Handling:** Static files copied to dist
- **TypeScript:** Full type checking before build

---

## Key File Locations

### Configuration Files
```
package.json                          # Dependencies & scripts
tsconfig.json                         # TypeScript config
tailwind.config.ts                    # Tailwind CSS config
vite.config.ts                        # Vite build config
drizzle.config.ts                     # Database config
postcss.config.js                     # PostCSS config
```

### Critical Source Files
```
shared/schema.ts                      # Database schema (single source of truth)
client/src/lib/supabase.ts           # Supabase client initialization
client/src/contexts/AuthContext.tsx  # Authentication context
client/src/App.tsx                   # Main app component with routing
client/src/lib/coach-utils.ts        # Coach business logic utilities
server/index.ts                      # Express server setup
```

### Key Hooks
```
client/src/hooks/use-auth.ts         # Authentication hook
client/src/hooks/use-dashboard-data.ts  # Dashboard data fetching
client/src/hooks/use-check-ins.ts    # Check-in data management
client/src/hooks/use-mobile.ts       # Responsive design hook
```

---

## Code Patterns & Conventions

### Component Structure
```typescript
// Standard page component pattern
export default function PageName() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery(...);

  if (isLoading) return <LoadingSpinner />;
  if (!data) return <EmptyState />;

  return (
    <div className="container">
      {/* Component content */}
    </div>
  );
}
```

### Data Fetching
```typescript
// TanStack Query pattern
const { data, isLoading, error } = useQuery({
  queryKey: ['key', dependency],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('table')
      .select('*')
      .eq('field', value);

    if (error) throw error;
    return data;
  }
});
```

### Form Handling
```typescript
// React Hook Form + Zod pattern
const form = useForm<FormType>({
  resolver: zodResolver(schema),
  defaultValues: {...}
});

const onSubmit = async (values: FormType) => {
  // Handle submission
};

return (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  </Form>
);
```

### Styling
```typescript
// Tailwind utility classes with conditional styling
<div className={cn(
  "base-classes",
  isActive && "active-classes",
  variant === "primary" && "primary-classes"
)}>
```

### Database Queries
```typescript
// Supabase query pattern with RLS
const { data, error } = await supabase
  .from('table_name')
  .select('*, related_table(*)')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(10);
```

---

## Future Enhancement Ideas

### API Layer
- [ ] Create dedicated REST API endpoints
- [ ] Move business logic from client to server
- [ ] Add caching layer (Redis)
- [ ] Implement rate limiting

### Coach Features
- [ ] Bulk client management
- [ ] Automated email/SMS notifications
- [ ] Coach analytics dashboard
- [ ] Client messaging system
- [ ] Template library for plans

### Client Features
- [ ] Mobile app (React Native)
- [ ] Social features (client community)
- [ ] AI-powered meal suggestions
- [ ] Workout video library
- [ ] Voice-based check-ins

### Technical Improvements
- [ ] Comprehensive testing suite
- [ ] CI/CD pipeline
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] Database query optimization
- [ ] Implement background jobs

### Analytics
- [ ] Advanced data visualization
- [ ] Predictive analytics
- [ ] Goal achievement forecasting
- [ ] Comparative benchmarking

---

## Common Issues & Solutions

### Authentication Issues
**Problem:** User session expires
**Solution:** Check Supabase session timeout settings, implement refresh token logic

### Data Not Loading
**Problem:** RLS policies blocking data
**Solution:** Verify user authentication, check RLS policy conditions in Supabase dashboard

### Build Failures
**Problem:** TypeScript errors
**Solution:** Run `npm run check`, fix type issues, ensure schema types are generated

### Coach Can't See Client Data
**Problem:** RLS policy not matching
**Solution:** Verify `coachId` relationship, check if coach is properly assigned to client

---

## Quick Reference

### Important Directories
```
/client/src/pages/          # All page components
/client/src/components/     # Reusable components
/client/src/lib/            # Utilities & helpers
/shared/schema.ts           # Database schema
/sqlmigrationfiles/         # SQL migrations
```

### Key Commands
```bash
npm run dev          # Start development
npm run build        # Build for production
npm run db:push      # Update database schema
npm run db:studio    # Open database UI
```

### Important URLs (Development)
```
http://localhost:5000              # Main app
http://localhost:4983              # Drizzle Studio
https://xxx.supabase.co           # Supabase Dashboard
```

---

**End of Reference Document**

*This document should be updated whenever significant changes are made to the codebase.*
