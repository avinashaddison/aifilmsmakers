# FilmAI - Cinematic Video Generator

## Overview

FilmAI is a web application that generates cinematic films from a single title input using AI. The system creates complete story frameworks, generates chapters, converts them into AI-generated videos, and merges them into full film sequences.

### Film Modes

**Short Film Mode (5 chapters, ~500 words each)**
- Quick, compact narrative structure
- Standard story arc with beginning, middle, and end

**Hollywood Screenplay Mode (18 chapters, ~15,000 words total)**
- Professional Hollywood-quality screenplay structure
- Each chapter has a specific narrative purpose and word count requirement
- Features a recurring symbolic object that evolves throughout the story
- Chapter structure:
  1. The Shattering Moment (Hook) - 150 words EXACTLY
  2. Before the Fall (Introduction I) - 850 words
  3. Quiet Routines & Hidden Cracks (Introduction II) - 850 words
  4. The Life They Thought They Had (Introduction III) - 850 words
  5. The First Disturbance (Inciting Incident) - 850 words
  6. Shockwaves (Early Development I) - 850 words
  7. Attempts to Restore Control (Early Development II) - 850 words
  8. Complications & Subplots (Early Development III) - 850 words
  9. The Deepening Storm (Middle Development I) - 850 words
  10. Truths Rising from the Past (Middle Development II) - 850 words
  11. The Breaking Point (Middle Development III) - 850 words
  12. The Plot Twist - 1,500 words EXACTLY
  13. Aftermath of the Truth (Climax Build-up I) - 850 words
  14. Final Preparations (Climax Build-up II) - 850 words
  15. Walking into the Storm (Climax Build-up III) - 850 words
  16. The Climax - 1,100 words
  17. The Dust Settles (Resolution I) - 850 words
  18. The Final Reflection (Resolution II) - 650 words

**Mandatory Writing Techniques:**
- Cinematic, mature, slow-burn, emotional, reflective tone
- Rich sensory detail (lighting, sound, textures, weather, shadows, body language)
- Minimalistic dialogue with heavy subtext
- Themes of memory, loss, legacy, and transformation
- One significant symbolic object per chapter that ties into the emotional arc

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
- WebSocket for real-time generation updates

### Real-Time Streaming (WebSocket)

The application uses WebSocket for real-time updates during video generation:

**Backend (server/routes.ts):**
- WebSocket server at `/ws` path
- Film-specific event subscriptions via `{ type: "subscribe", filmId }`
- Event types emitted during generation:
  - `stage_update` - Pipeline stage changes
  - `scene_prompt` - Scene prompt generated
  - `scene_video_started` - Video generation begins for a scene
  - `scene_video_completed` - Video ready with URL for preview
  - `scene_video_failed` - Video generation failed
  - `chapter_complete` - All scenes in chapter done
  - `pipeline_complete` - Full film ready

**Frontend (client/src/pages/progress.tsx):**
- WebSocket connection with auto-reconnect (3s delay)
- Proper lifecycle management with isActive guard
- "Live" connection indicator with Wifi icon
- Real-time message display
- Video preview grid showing completed scenes as they arrive
- Reduced polling when WebSocket connected (5s vs 2s)

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