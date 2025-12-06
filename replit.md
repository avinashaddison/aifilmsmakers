# FilmAI - Cinematic Video Generator

## Overview

FilmAI is a web application that generates cinematic films from a single title input using AI. The system creates complete story frameworks, generates chapters, converts them into AI-generated videos, and merges them into full film sequences. Users can create films in three modes: Cinematic Film Mode (full movie-like storyline), Short Film Mode (5-part compact narrative), and Storyboard Mode (shot-by-shot frames with prompts).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React with TypeScript for type safety and component-based UI
- Vite as the build tool and development server for fast HMR and optimized production builds
- Wouter for lightweight client-side routing
- TanStack Query for server state management, caching, and data synchronization
- Tailwind CSS with custom theming for styling

**UI Component System:**
- Shadcn/ui component library with Radix UI primitives
- Custom "GlassCard" component for glassmorphism design pattern
- Orbitron font for headings, Inter for body text
- Dark cyberpunk theme with neon accents (cyan #00F3FF, purple #BC13FE)

**Routing Structure:**
- `/` - Home dashboard listing all films
- `/create` - Film creation with title input
- `/framework/:filmId` - Story framework display and editing
- `/chapters/:filmId` - Chapter management and overview
- `/generator/:filmId` - Video generation interface with chapter selection
- `/assembly/:filmId` - Film assembly and merging interface
- `/download/:filmId` - Final film download and export

**State Management:**
- TanStack Query for API data with infinite stale time
- React hooks for local component state
- Toast notifications via custom useToast hook

### Backend Architecture

**Technology Stack:**
- Express.js server with TypeScript
- Node.js with ES modules
- HTTP server created via Node's `http` module

**API Design:**
- RESTful API endpoints under `/api` prefix
- JSON request/response format
- Request logging middleware tracking method, path, status, and duration

**Build System:**
- ESBuild for server bundling with selective dependency bundling (allowlist approach)
- Vite for client bundling
- Single production build combining client and server

**Development Environment:**
- Vite dev server in middleware mode for HMR
- Replit-specific plugins for error handling and development banners
- Custom meta-images plugin for OpenGraph image URL updates

### Data Storage

**ORM and Database:**
- Drizzle ORM for type-safe database interactions
- PostgreSQL as the database (configured via `DATABASE_URL` environment variable)
- Node-postgres (pg) for connection pooling

**Schema Design:**

Three main tables with UUID primary keys:

1. **Films Table:**
   - Stores basic film metadata (id, title, status, createdAt)
   - Status field tracks workflow: "draft" → "generating" → "completed"

2. **Story Frameworks Table:**
   - One-to-one relationship with Films (cascading delete)
   - Stores premise, hook, genre, tone
   - JSONB fields for structured data:
     - `setting`: location, time, weather, atmosphere
     - `characters`: array of character objects with name, age, role, description, actor

3. **Chapters Table:**
   - One-to-many relationship with Films
   - Tracks chapter number, title, summary, prompt
   - Stores video generation status and metadata
   - Contains videoUrl and duration for generated content

**Data Access Pattern:**
- Repository pattern via `IStorage` interface
- `DbStorage` class implements all database operations
- Separation of concerns between routes and data access

### Authentication and Authorization

Currently no authentication system implemented. The application appears designed for single-user or development use.

### External Dependencies

**AI Integration:**
- Anthropic Claude (claude-sonnet-4-5) for story framework and chapter generation
- API key via `AI_INTEGRATIONS_ANTHROPIC_API_KEY` environment variable
- Base URL configurable via `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`
- Custom prompts engineered for cinematic content generation

**Video Generation API:**
- VideogenAPI integration mentioned in requirements (implementation in progress)
- Intended for converting chapter text/prompts into cinematic video clips

**Development Tools:**
- Replit-specific plugins for cartographer and dev banner
- Runtime error modal overlay in development
- Custom Vite plugin for meta image URL updates based on deployment domain

**UI Libraries:**
- Radix UI primitives (30+ component packages)
- Lucide React for icons
- TailwindCSS with autoprefixer
- date-fns for date formatting
- Zod for schema validation with Drizzle integration

**Session Management:**
- connect-pg-simple for PostgreSQL-backed sessions (configured but not actively used)

**Build Dependencies:**
- TypeScript for type checking
- ESBuild and Vite for bundling
- tsx for running TypeScript in Node.js during development

### Design Patterns

**Component Architecture:**
- Separation of UI components (`client/src/components/ui/`) from page components
- Shared schema definitions (`shared/schema.ts`) used by both client and server
- Path aliases for clean imports (@/, @shared/, @assets/)

**Error Handling:**
- API errors thrown and caught at request layer
- Toast notifications for user-facing errors
- Development-only runtime error overlay

**Type Safety:**
- End-to-end TypeScript coverage
- Drizzle-Zod integration for runtime validation matching database schema
- Inferred types from database schema for consistency

**Build Optimization:**
- Selective dependency bundling to reduce cold start syscalls
- Allowlist approach for frequently-used server dependencies
- Separate client and server build outputs combined in production