
# Dawnage AI Fitness Dashboard - Design Guidelines

## Design Approach
**Reference-Based Approach**: Directly inspired by dawnage.com's premium fitness-luxury aesthetic with clean, minimal design, bold typography, and high-contrast dark theme optimized for data visualization and client engagement.

## Core Design Principles
- **Premium Fitness-Luxury Tone**: High-end, performance-focused aesthetic that conveys expertise and professionalism
- **Data-Focused Clarity**: Minimal distractions with emphasis on metrics, charts, and actionable insights
- **Real-time Responsiveness**: Instant visual feedback for all data updates and user interactions
- **Dark Mode Excellence**: Deep, rich backgrounds with strategic accent colors for hierarchy

## Color System

### Background & Surface
- **Primary Background**: `#0B0B0C` (deep charcoal)
- **Card Surface**: `#131416` (elevated charcoal)
- **Borders/Dividers**: `#1F1F23` (subtle separation)

### Typography
- **Primary Text**: `#FFFFFF` (pure white)
- **Secondary Text**: `#A1A1A8` (muted gray)
- **Disabled Text**: `#6B6B70`

### Accent Colors
- **Primary Action**: `#F04E45` (red - CTAs, alerts, primary actions)
- **Success/Progress**: `#00D26A` (green - achievements, positive metrics)
- **Highlight/Premium**: `#F6C85A` (gold - special features, premium indicators)

### Data Visualization
- Use accent colors for chart lines and bars
- Implement glowing effects on progress bars using box-shadow with accent colors
- Green for positive trends, red for attention areas, gold for achievements

## Typography

### Font Families
- **Primary**: Inter (headings, UI elements, navigation)
- **Secondary**: Poppins (body text, metrics, data labels)
- Load via Google Fonts CDN

### Hierarchy
- **Hero/Page Headers**: 3xl-4xl, font-bold, tracking-tight
- **Section Headers**: 2xl-3xl, font-semibold
- **Card Titles**: xl-2xl, font-semibold
- **Metrics/Numbers**: 2xl-4xl, font-bold (Poppins)
- **Body Text**: base-lg, font-normal
- **Labels/Captions**: sm-base, text-muted (#A1A1A8)

## Layout System

### Spacing Units
Use Tailwind spacing primitives: **2, 4, 6, 8, 12, 16, 24** (e.g., p-4, gap-6, mt-8, py-24)

### Grid & Structure
- **Dashboard Layout**: Sidebar navigation (w-64) + main content area (flex-1)
- **Card Grid**: 1-4 columns responsive (grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4)
- **Charts Section**: 2-column layout on desktop, stack on mobile
- **Container Max Width**: max-w-7xl for main content areas

### Cards & Containers
- **Border Radius**: `rounded-2xl` for all cards and containers
- **Shadows**: Subtle elevation with `shadow-lg shadow-black/20`
- **Padding**: p-6 to p-8 for card interiors
- **Gaps**: gap-6 to gap-8 between cards

## Component Library

### Navigation
- **Sidebar**: Fixed position, dark background (#0B0B0C), icon + label navigation items
- **Active State**: Red accent (#F04E45) with subtle background (#131416), left border indicator
- **Hover State**: Subtle background change to (#131416)
- **Logo Placement**: Top of sidebar with provided Dawnage AI logo

### Cards
- **Metric Cards**: Large number display (3xl-4xl Poppins bold), label below (sm gray), icon top-right
- **Info Cards**: #131416 background, rounded-2xl, p-6, subtle shadow
- **Progress Cards**: Include glowing progress bars with gradient from accent colors

### Forms
- **Input Fields**: Dark background (#131416), white text, rounded-xl, border subtle (#1F1F23)
- **Focus State**: Red border (#F04E45), ring-2 ring-red-500/20
- **Labels**: Uppercase, text-xs, tracking-wide, muted gray
- **Submit Buttons**: Red background (#F04E45), rounded-xl, px-6 py-3, font-semibold

### Charts (Recharts)
- **Line Charts**: Smooth curves, red/green/gold stroke colors, dot markers on data points
- **Bar Charts**: Rounded tops, gradient fills using accent colors
- **Chart Background**: Transparent with subtle grid lines (#1F1F23)
- **Tooltips**: Dark (#131416) with white text, rounded-lg, shadow-lg

### Progress Indicators
- **Progress Bars**: h-2 to h-3, rounded-full, glowing effect with box-shadow
- **Filled Portion**: Green (#00D26A) for on-track, red (#F04E45) for needs attention
- **Glow Effect**: `shadow-[0_0_10px_rgba(0,210,106,0.5)]` for green, similar for red

### Buttons
- **Primary**: bg-[#F04E45], text-white, rounded-xl, px-6 py-3, font-semibold
- **Secondary**: border-2 border-[#F04E45], text-[#F04E45], rounded-xl, px-6 py-3
- **Ghost**: text-white, hover:bg-[#131416], rounded-xl, px-4 py-2

### Data Display
- **Stat Numbers**: 3xl-4xl Poppins bold, white text
- **Trend Indicators**: Small arrows with green/red, percentage change beside metrics
- **Badges**: Rounded-full, px-3 py-1, text-xs font-semibold, colored backgrounds

## Page-Specific Layouts

### Dashboard (Overview)
- **Hero Metrics Row**: 3-4 cards showing key stats (weight, workouts completed, nutrition score, streak)
- **Charts Section**: 2-column grid with weight trend (line) and weekly performance (bar)
- **Quick Actions**: Collapsible section for daily check-in shortcut
- **Recent Activity Feed**: Timeline-style list of recent entries

### Check-Ins (Daily Form)
- **Single Column Form**: max-w-2xl, centered, with clear section breaks
- **Section Groups**: Workout, Nutrition, Vitals, Wellbeing (each with subtle dividers)
- **Input Groups**: Label above, input/select below, helper text in muted gray

### Measurements
- **Progress Timeline**: Vertical timeline with weekly measurement cards
- **Photo Grid**: 2x2 grid (front/back/left/right) with upload placeholders
- **Measurement Chart**: Line chart showing body measurement trends over time

### Plans (Workout & Meal)
- **Tabbed Interface**: Clean tabs for Workout/Meal plans with red underline for active
- **Weekly Schedule**: 7-day grid for workout plan, collapsible day details
- **Meal Plan Cards**: Breakfast/Lunch/Dinner/Snacks, each in separate card with macros

### Analytics
- **Multi-Chart Dashboard**: 2-3 column grid of various chart types
- **Filter Bar**: Top section with date range picker, metric selectors
- **Insights Cards**: Automated insights based on data patterns (green/gold highlights)

### Media Gallery
- **Grid Layout**: 3-4 columns of progress photos, chronological order
- **Lightbox View**: Full-screen photo viewer with navigation arrows
- **Upload Zone**: Drag-drop area with category selection (front/back/left/right)

## Images

### Logo
- **Placement**: Top of sidebar navigation, centered
- **Treatment**: Use provided Dawnage AI logo, maintain aspect ratio
- **Size**: Appropriate for sidebar width (approximately 180-200px wide)

### Progress Photos
- **Image Containers**: Square aspect ratio (1:1), rounded-xl, object-cover
- **Placeholder**: Dark background (#131416) with upload icon and text
- **Overlay**: Subtle dark gradient on hover with "View" text

### Hero/Feature Images
- **Not Required**: This dashboard is data-focused; avoid decorative hero images
- **Focus**: Prioritize charts, metrics, and functional content over imagery

## Animations

Use sparingly for professional feel:
- **Page Transitions**: Subtle fade-in (duration-200)
- **Chart Animations**: Progressive rendering on data load
- **Hover States**: Smooth transform and background transitions (transition-all duration-200)
- **Loading States**: Skeleton screens matching card structures with pulse animation

## Accessibility

- High contrast maintained (white on dark charcoal)
- Focus states clearly visible with red ring
- Form labels always present
- Chart data accessible via tooltips
- Alt text for all images
- Keyboard navigation throughout sidebar