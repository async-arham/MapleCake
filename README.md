<p align="center">
  <img src="src/app/icon.svg" width="76" alt="MapleCake logo">
</p>

<h1 align="center">MapleCake</h1>

<p align="center"><strong>Know which projects are slipping before they ship late.</strong></p>

<p align="center">
  <a href="https://maplecake.vercel.app/">Open MapleCake</a> ·
  <a href="#how-the-health-score-works">Health score</a> ·
  <a href="#run-locally">Run locally</a>
</p>

MapleCake is a project health tracker for student developers, hackathon teams, and small software teams. It turns overdue work and unresolved critical bugs into a **0–100 health score** and shows which tasks lowered it and what to fix first.

**Every feature is free for every team.**

## What you can do

| Feature | What it does |
| --- | --- |
| **Dashboard** | See project health, open and completed work, overdue tasks, and task trends across projects. |
| **Project health** | Open a project to see its score, the tasks behind each deduction, and suggested next steps. |
| **Kanban board** | Drag tasks across To Do, In Progress, In Review, and Done, or use the keyboard-friendly **Move to** menu. |
| **Task list** | Track tasks, bugs, and features by assignee, priority, due date, and status. Search and filter the list. |
| **Teams and invitations** | Invite teammates to private projects and manage access with Owner, Admin, Member, and Viewer roles. |
| **Activity and notifications** | See who changed what and get in-app updates for assignments, overdue work, team changes, and health alerts. |

## How the health score works

Every project starts at **100**.

| Signal | Deduction |
| --- | --- |
| Open work past its due date | Low **−2**, medium **−4**, high **−6**, critical **−10** per item. More than seven days late adds 50%. Total deduction capped at 55. |
| Unresolved critical bugs | **−15** per bug, capped at 45. |

Due dates are evaluated in UTC. **80–100** is Healthy, **60–79** is Needs watching, **40–59** is At risk, and **0–39** is Critical. When a change takes the score below 60, MapleCake notifies the project owner and admins.

For example, one unresolved critical bug and one separate high-priority task that is three days overdue give a score of **79** (100 − 15 − 6). The project overview points the team to both items.

## Run locally

You’ll need **Node.js 20.9+**, npm, and a Supabase Postgres project.

```bash
git clone https://github.com/async-arham/MapleCake.git
cd MapleCake
npm ci
cp .env.example .env
cp .env.example .env.local
```

In Supabase, open **Connect** and copy the transaction pooler and session pooler connection strings. Set these values in both files. Next.js reads `.env.local`, while Prisma commands and the seed script use `.env`.

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Transaction pooler URL, port **6543**, with `pgbouncer=true` in the query string. |
| `DIRECT_URL` | Session pooler or direct connection URL, port **5432**, for migrations. |
| `AUTH_SECRET` | Random session-signing secret of at least 32 characters. Generate one with `openssl rand -base64 32`. |
| `APP_URL` | `http://localhost:3000` locally. Use your deployment URL in production. |

Replace the password placeholder in each connection string and URL-encode any special characters in the password.

```bash
npm run db:deploy
npm run dev
```

Open [localhost:3000](http://localhost:3000). For local sign-up, leave SMTP unconfigured and read the verification code in the dev terminal. Run `npm run db:seed` against your development database if you want sample projects and tasks.

## Stack and codebase

**Next.js 16 App Router · React 19 · TypeScript · PostgreSQL on Supabase · Prisma 6 · Zod · CSS Modules**

| Path | What lives there |
| --- | --- |
| [`src/app/`](src/app/) | Pages, route handlers, and layout |
| [`src/components/`](src/components/) | Kanban board, forms, and shared UI |
| [`src/lib/`](src/lib/) | Health scoring, authorization helpers, dates, and session utilities |
| [`src/server/`](src/server/) | Actions, services, queries, and verification email |
| [`prisma/`](prisma/) | Database schema, migrations, and demo seed |
| [`tests/`](tests/) | Unit, integration, and end-to-end tests |

Project permissions are enforced on the server. Accounts use email verification, bcrypt password hashing, and signed HTTP-only session cookies.

## Test

```bash
npm run typecheck
npm test
```

To run integration tests, set `TEST_DATABASE_URL` to a **disposable** Postgres database with migrations applied. The tests clear its tables. For the end-to-end smoke test, run a local production build on port 3100 with `EMAIL_VERIFICATION=off` and a dedicated test database, then run `BASE=http://localhost:3100 npm run test:e2e`.

## Deploy to Vercel

1. Import the repository into Vercel as a Next.js project.
2. Set the database and session variables above, use the deployed URL for `APP_URL`, and configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` for verification emails. Set `EMAIL_FROM` if you want a custom sender.
3. Apply migrations using `npm run db:deploy` with the deployment database settings.
4. Set `CRON_SECRET` to a random value of at least 16 characters to enable the scheduled overdue-task check defined in [`vercel.json`](vercel.json).
5. Deploy and open `/api/health` on your deployment. A healthy response is `{"status":"ok","database":"up"}`.

---

Built by [Arham Hussain](https://github.com/async-arham).
