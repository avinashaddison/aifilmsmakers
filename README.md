# FilmAI - Cinematic Video Generator

An AI-powered web application that transforms a simple title into a complete cinematic film. The system creates story frameworks, generates chapters, converts them into AI-generated videos, and merges everything into full film sequences.

## Features

- **Story Framework Generation**: AI creates complete story structures with premise, setting, characters, and plot hooks
- **Chapter Generation**: Automatically writes detailed chapters with cinematic descriptions
- **Scene Splitting**: Breaks chapters into optimized 10-20 second video segments
- **Video Generation**: Generates cinematic video clips using VideogenAPI
- **Audio Narration**: Creates professional narration using Replicate's parler-tts
- **Automatic Assembly**: Combines audio and video, merges scenes into chapters, and chapters into complete films

## Film Modes

### Short Film Mode (5 chapters)
Quick, compact narrative structure with ~500 words per chapter.

### Hollywood Screenplay Mode (18 chapters)
Professional Hollywood-quality screenplay with ~15,000 total words featuring:
- Specific narrative purpose per chapter
- Recurring symbolic object throughout the story
- Mature, slow-burn, emotionally reflective tone

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS, TanStack Query
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: Anthropic Claude for story generation
- **Video**: VideogenAPI for video generation
- **Audio**: Replicate parler-tts for narration
- **Video Processing**: FFmpeg for assembly

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- API keys for:
  - Anthropic Claude
  - VideogenAPI
  - Replicate

### Installation

1. Clone the repository:
```bash
git clone https://github.com/avinashaddison/aifilmsmakers.git
cd aifilmsmakers
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
DATABASE_URL=your_postgres_connection_string
AI_INTEGRATIONS_ANTHROPIC_API_KEY=your_anthropic_key
VIDEOGEN_API_KEY=your_videogen_key
REPLICATE_API_TOKEN=your_replicate_token
```

4. Push the database schema:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5000`

## Project Structure

```
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Route pages
│   │   └── lib/         # Utilities
├── server/              # Express backend
│   ├── routes.ts        # API endpoints
│   └── storage.ts       # Database operations
├── shared/              # Shared types and schema
│   └── schema.ts        # Drizzle database schema
└── drizzle/             # Database migrations
```

## API Endpoints

- `POST /api/films` - Create a new film
- `GET /api/films/:id` - Get film details
- `POST /api/films/:id/generate-framework` - Generate story framework
- `POST /api/films/:id/generate-chapters` - Generate chapters
- `POST /api/films/:id/split-scenes` - Split chapters into scenes
- `POST /api/films/:id/generate-scene-videos` - Generate scene videos
- `POST /api/films/:id/merge-final` - Merge all content into final film
- `GET /api/films/:id/generation-status` - Check generation progress

## License

MIT License

## Author

Created with FilmAI
