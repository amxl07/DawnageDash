# Dawnage AI - Fitness Coaching Dashboard

## Overview

Dawnage AI is a premium fitness coaching dashboard designed for clients to track their fitness journey comprehensively. The application provides real-time insights into workout performance, nutrition tracking, body measurements, progress photos, and personalized coaching plans. Built with a luxury-performance aesthetic inspired by dawnage.com, the platform emphasizes data clarity, visual excellence, and an intuitive user experience.

The dashboard enables clients to:
- Monitor daily check-ins with vitals, workout status, nutrition scores, and wellbeing metrics
- Track body measurements and composition changes over time
- Access personalized workout and meal plans
- View detailed analytics with interactive charts and visualizations
- Upload and compare progress photos
- Manage their profile and coaching preferences

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast hot module replacement
- Single Page Application (SPA) architecture using `wouter` for client-side routing
- Component-based architecture following atomic design principles

**UI Component Library**
- shadcn/ui components built on Radix UI primitives for accessibility
- Tailwind CSS for utility-first styling with custom design tokens
- Custom theme system using CSS variables for dark mode and color schemes
- Recharts library for data visualization (charts, graphs, radar plots)

**State Management**
- TanStack Query (React Query) for server state management and API caching
- Local component state with React hooks for UI interactions
- Query client configured with custom fetch utilities for API requests

**Design System**
- Premium fitness-luxury aesthetic with dark mode (#0B0B0C background, #131416 cards)
- High-contrast color palette: primary red (#F04E45), success green (#00D26A), gold (#F6C85A)
- Typography hierarchy using Inter and Poppins font families
- Rounded-2xl cards with subtle shadows and glowing progress indicators
- Responsive grid layouts optimized for desktop and mobile viewports

### Backend Architecture

**Server Framework**
- Express.js server with TypeScript for type safety
- RESTful API design with `/api` prefix for all endpoints
- Session-based authentication (foundation in place via connect-pg-simple)
- Middleware for request logging, JSON parsing, and error handling

**Development Workflow**
- Vite middleware integration for seamless HMR during development
- Separate build processes for client (Vite) and server (esbuild)
- Environment-based configuration for development vs production

### Data Storage Solutions

**Database**
- PostgreSQL as the primary relational database
- Neon serverless PostgreSQL adapter for cloud deployment
- Drizzle ORM for type-safe database queries and schema management
- Migration system via drizzle-kit for schema versioning

**Current Schema**
- Users table with authentication fields (username, password)
- Schema located in `shared/schema.ts` for type sharing between client and server
- Zod validation schemas derived from Drizzle tables for runtime validation

**Storage Interface**
- Abstraction layer (`IStorage` interface) for CRUD operations
- In-memory storage implementation (`MemStorage`) for development/testing
- Designed to be swapped with database-backed implementation

**Expected Data Models** (based on UI components):
- Clients: profile information, phone authentication, region, timezone
- Check-ins: daily vitals, workout status, nutrition scores, wellbeing metrics
- Measurements: weekly body composition data (weight, chest, waist, hip, thigh, arm)
- Workout Plans: exercises with sets, reps, rest periods organized by day
- Meal Plans: meals with macronutrient breakdowns (protein, carbs, fats, calories)
- Progress Photos: media uploads with timestamps and body views
- Goals: targets with current progress and deadline tracking
- Analytics: aggregated metrics and trend data

### External Dependencies

**Third-Party UI Libraries**
- Radix UI: Headless UI component primitives for accessibility (20+ components including dialogs, dropdowns, accordions, tooltips)
- Lucide React: Icon library for consistent iconography
- Embla Carousel: Touch-friendly carousel component
- cmdk: Command menu/palette component
- date-fns: Date manipulation and formatting utilities

**Data Visualization**
- Recharts: Declarative charting library for line charts, bar charts, radar charts, pie charts, and composed visualizations

**Form Management**
- React Hook Form: Form state management with performance optimization
- Hookform Resolvers: Integration with Zod for form validation
- Zod: Schema validation for forms and API data

**Authentication & Session**
- connect-pg-simple: PostgreSQL session store for Express sessions
- Session-based authentication architecture (implementation pending)

**Development Tools**
- TypeScript compiler for type checking
- ESBuild for server bundling
- Vite plugins for Replit integration (runtime error overlay, cartographer, dev banner)

**Styling Dependencies**
- Tailwind CSS with PostCSS and Autoprefixer
- class-variance-authority: Type-safe variant styling for components
- clsx and tailwind-merge: Utility for conditional class composition

**Expected External Services** (based on design requirements):
- Supabase: Authentication, database, and file storage (referenced in requirements but not yet integrated)
- Phone number verification service for client authentication
- Cloud storage for progress photos and media assets