# SprintBeacon

A project health tracker for developers. Track projects and tasks, see a 0-100 health
score for every project, and get clear suggestions on what to fix first.

**Stack:** Next.js (App Router) · TypeScript · PostgreSQL on Supabase · Prisma · Zod · hand-written CSS Modules (no CSS frameworks)

> This README grows with each build stage. The full version (database, migrations,
> environment variables, Vercel deployment) is completed in Stage 7.

## Build progress

- [x] Stage 1 - Project setup and structure
- [ ] Stage 2 - Database with Supabase and Prisma
- [ ] Stage 3 - Sign in and permissions
- [ ] Stage 4 - Projects, tasks and Kanban board
- [ ] Stage 5 - Health score, analytics and notifications
- [ ] Stage 6 - Teams and activity history
- [ ] Stage 7 - Testing and deployment

## Run it locally

Requires Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Health check: http://localhost:3000/api/health

## Scripts

| Command             | What it does                          |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Start the development server          |
| `npm run build`     | Create a production build             |
| `npm run start`     | Run the production build              |
| `npm run typecheck` | Check TypeScript types without output |

## Project structure

```
src/
  app/            Pages, layouts and route handlers (Next.js App Router)
  components/ui/  Reusable interface pieces (buttons, inputs, badges)
  lib/            Shared helpers (database client, auth, health score)
  server/
    actions/      Server Actions that change data (server-only)
    queries/      Functions that read data (server-only)
  validation/     Zod schemas that check all user input
prisma/           Database schema and migrations (added in Stage 2)
```

Rule of thumb: anything that touches the database or secrets lives under `src/server`
or `src/lib` and imports `server-only`, so it can never be bundled into browser code.
