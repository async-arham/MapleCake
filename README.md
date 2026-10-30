# Maplecake

A project health tracker for developers. Create projects, manage tasks on a Kanban board, and see a
**0-100 health score** for every project with a plain-English explanation and suggested next steps.

**Stack:** Next.js 16 (App Router) · TypeScript · PostgreSQL on Supabase · Prisma 6 · Zod · hand-written CSS Modules (no CSS framework)

## Features

- Registration, sign in and sign out (bcrypt password hashing, signed HTTP-only session cookie)
- Projects: create, edit, archive/restore, delete (delete requires typing the project name)
- Tasks with status, priority, type (task / bug / feature), due date and assignee
- Kanban board (To Do, In Progress, In Review, Done) with drag and drop and a keyboard-friendly "Move to" menu
- Dashboard: active projects, open / completed / overdue tasks, average health, per-project health, charts
- Health score with explanation and suggested actions (see below)
- Team members with roles (Owner, Admin, Member, Viewer), activity history, in-app notifications
- Profile page: edit your name, change your password, delete your account (see below)
- Search, filters, sorting and pagination on projects and tasks
- Loading, empty and error states on every page

## Quick start

Requires Node.js 20.9+ and a Supabase account (free tier is fine).

```bash
npm install
cp .env.example .env.local      # used by `next dev`
cp .env.example .env            # used by Prisma commands and the seed script
# fill in the values (see "Environment variables"), then:
npm run db:deploy               # creates the tables in Supabase
npm run db:seed                 # optional demo data
npm run dev                     # http://localhost:3000
```

Demo login after seeding: `demo@maplecake.dev` / `demo-password-1` (also `teammate@maplecake.dev`).

## 1. Create the Supabase database

1. Go to https://supabase.com, create a project, and save the **database password** you choose.
2. Click **Connect** at the top of the dashboard and copy two connection strings:
   - **Transaction pooler** (port **6543**) -> `DATABASE_URL`. Append `?pgbouncer=true`.
   - **Session pooler** (port **5432**) or **Direct connection** -> `DIRECT_URL`.
3. Replace `[YOUR-PASSWORD]` in both. If the password contains special characters, URL-encode them (`@` becomes `%40`).

> Why two URLs? The running app uses the pooled URL, which copes with many short serverless
> connections. Prisma migrations need a normal session, so they use the direct/session URL.

## 2. Environment variables

| Variable       | Required | Purpose |
| -------------- | -------- | ------- |
| `DATABASE_URL` | yes      | Supabase pooled connection used by the app |
| `DIRECT_URL`   | yes      | Supabase direct/session connection used by `prisma migrate` |
| `AUTH_SECRET`  | yes      | Signs session cookies. 32+ random characters: `openssl rand -base64 32` |
| `APP_URL`      | no       | Public URL of the app (default `http://localhost:3000`) |
| `CRON_SECRET`  | no       | 16+ characters. Enables `/api/cron/overdue` (Vercel Cron sends it automatically) |

All variables are read on the server only. Nothing here uses the `NEXT_PUBLIC_` prefix, so nothing reaches the browser.
The app validates them with Zod and shows a clear message if one is missing or malformed.

## 3. Database and migrations

The schema lives in `prisma/schema.prisma`; the SQL is in `prisma/migrations/`.

| Table | Purpose |
| ----- | ------- |
| `User` | Accounts (unique lowercase email, bcrypt hash) |
| `Project` | Projects with `ACTIVE` / `ARCHIVED` status and an owner |
| `ProjectMember` | Who belongs to which project, and their role (unique per project + user) |
| `Task` | Status, priority, type, due date, assignee, creator, completion time |
| `ActivityLog` | Who did what in a project |
| `Notification` | Per-user in-app notifications with read state |

Foreign keys cascade sensibly (deleting a project removes its tasks, activity and notifications; deleting a user
who is a task assignee sets the assignee to empty). Indexes cover the common queries (tasks by project + status,
project + due date, member lookups, unread notifications). The migration also adds database-level `CHECK`
constraints (lowercase email, non-blank names and titles).

```bash
npm run db:deploy     # apply existing migrations (use this for Supabase and production)
npm run db:migrate    # create a NEW migration after you edit schema.prisma (development)
npm run db:studio     # browse the data
```

**Row Level Security.** Supabase exposes tables in the `public` schema through its REST API. The initial migration
turns on RLS for every table with no policies, so that API can read nothing. Maplecake is unaffected because
it connects directly through Prisma as the table owner and enforces access in server code. Do not add permissive
RLS policies unless you also intend to use Supabase's client libraries.

## 4. Health score

Start at **100**, then subtract:

- **Overdue open tasks:** low 2, medium 4, high 6, critical 10 points each. Tasks more than 7 days late cost 50% more. Capped at 55.
- **Unresolved critical bugs** (type Bug, priority Critical, not Done): 15 points each. Capped at 45.

A task is overdue once its whole due day (UTC) has passed. Bands: **80+ Healthy**, **60-79 Needs watching**,
**40-59 At risk**, **below 40 Critical**. The overview page lists each factor, the exact tasks causing it, and
suggested actions (for example, "give an owner to 2 overdue tasks that nobody is assigned to").
The logic is one pure function in `src/lib/health.ts`, covered by unit tests. When a change drops a project below 60,
its owner and admins get a notification.

## 5. Roles

| | Viewer | Member | Admin | Owner |
|---|:-:|:-:|:-:|:-:|
| View project, board, activity | yes | yes | yes | yes |
| Create and edit tasks, move cards | | yes | yes | yes |
| Delete tasks | | own | any | any |
| Edit / archive project | | | yes | yes |
| Add or remove members below their role | | | yes | yes |
| Delete project | | | | yes |

You can only hand out roles lower than your own; Owner can never be granted. Archived projects are read-only.

### Profile and account deletion

`/profile` lets you rename yourself, change your password (current password required, 5 attempts per 15 minutes) and delete your account
(password and your typed email required). Deleting an account:

- is **blocked** while you own a project that other people belong to (there is no ownership transfer yet: delete the project or remove the others);
- deletes projects only you belong to, together with their tasks and activity;
- keeps tasks you created in other people's projects, handing them to that project's owner, because a task must have a creator;
- unassigns tasks assigned to you, leaves a "deleted their account" line in each project's activity, and runs in one transaction.

Changing a password does not sign out other devices (sessions are stateless JWTs that last 7 days).

## 6. Testing

```bash
npm run typecheck
npm test                                   # unit tests (and integration tests if TEST_DATABASE_URL is set)

# Integration tests need a DISPOSABLE Postgres database with migrations applied. They empty every table first.
TEST_DATABASE_URL="postgresql://..." npm test

# End-to-end smoke test against a running production build:
npm run build && npm start -- -p 3100      # in one terminal
BASE=http://localhost:3100 npm run test:e2e   # in another (uses your real DATABASE_URL, creates test users)
```

- **Unit tests:** health scoring, permissions, Zod schemas, date handling, rate limiter, pool config.
- **Integration tests (real PostgreSQL):** a stranger gets "not found" for every read and write on someone else's project;
  viewer / member / admin / owner rules; cross-project task access; assignment rules; pagination, search, filter and sort;
  health score and notifications; database CHECK constraints.
- **End-to-end test (HTTP):** register, sign in, create projects and tasks, then attack as a second user, including replaying
  the first user's real form submissions with the second user's cookie.

## 7. Deploy to Vercel

1. Push the project to GitHub and **Import** it in Vercel (framework preset: Next.js).
2. Before the first deploy, add `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `APP_URL` (your Vercel URL) and `CRON_SECRET`
   under **Settings > Environment Variables**. (`postinstall` runs `prisma generate`; set the variables first so it works cleanly.)
3. Apply migrations to Supabase from your machine using the production `DIRECT_URL`: `npm run db:deploy`.
   Do this whenever you add a migration. (You can instead set the Vercel build command to `prisma migrate deploy && next build`.)
4. Deploy. Check `https://YOUR-APP/api/health`: it should return `{"status":"ok","database":"up"}`.
5. `vercel.json` schedules a daily job (06:00 UTC) calling `/api/cron/overdue`, which creates "task overdue" notifications.
   Overdue notices are also created for you whenever you open the dashboard. Hobby plans allow daily cron jobs.

## Project structure

```
prisma/               schema, migrations, seed script
src/
  app/                pages and route handlers: (auth) sign in/up, (app) the signed-in product, api/
  components/         ui/ (forms, buttons, badges, gauge), layout/, tasks/ (Kanban), projects/
  lib/                health score, permissions, dates, constants, db client, auth/ (session, password, token)
  server/
    actions/          Server Actions: validate input (Zod) -> call a service -> refresh/redirect
    services/         business rules and writes; every function takes the acting userId
    queries/          reads (lists, dashboard, health)
    access.ts         requireMembership(): the one gate for project data
  validation/         Zod schemas
  proxy.ts            route protection (Next.js 16 name for middleware)
tests/                unit, integration, e2e
```

## Security notes

- **Authorization is enforced on the server in two places:** every page calls `getProjectContext`, and every write goes through
  `requireMembership`. Non-members get "not found" rather than "forbidden", so private projects are not revealed to strangers.
  `proxy.ts` is only a convenience redirect.
- Passwords: bcrypt (cost 12), 10-72 characters with a letter and a number. Login uses one generic error message and compares
  against a dummy hash for unknown emails so timing does not reveal which emails exist.
- Sessions: JWT (HS256) in an `HttpOnly`, `SameSite=Lax` cookie (`Secure` in production), 7 days.
  Server Actions have built-in origin checking against cross-site form posts.
- All input is validated with Zod; all queries go through Prisma (parameterized). React escapes output.
- Security headers are set in `next.config.ts`.
- **Known behaviours and limits:**
  - Not-found pages inside the signed-in area return HTTP **200** with `noindex` (Next.js cannot change the status after streaming
    starts). They contain no project data; this is checked by the end-to-end test.
  - The login rate limiter is in memory, so on serverless hosting each instance counts separately. For strict limits add a
    shared store (e.g. Redis) or a WAF rule.
  - Registration tells you when an email is already taken (a common usability trade-off).
  - There is no email verification or password reset yet.
  - `Secure` cookies and Safari: Safari does not store `Secure` cookies on plain `http://localhost` when running `npm start`. Use `npm run dev`
    or Chrome/Firefox for local production-mode testing.

## Troubleshooting

- **"Invalid environment variables"**: the message names the variable. Check `.env.local`.
- **`P1001` / can't reach database**: check the password (URL-encode special characters) and that you used the pooler hostname from the Connect dialog.
- **Prepared statement errors**: make sure `DATABASE_URL` is the *transaction pooler* URL and includes `?pgbouncer=true`.
- **Prisma commands can't find the URL**: Prisma reads `.env`, not `.env.local`. Keep both files.
