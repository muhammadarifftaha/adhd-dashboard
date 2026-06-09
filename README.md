# ADHD Dashboard

A self-hosted, gamified daily dashboard built to be the single starting point for a
workday. It's designed around how an ADHD brain actually works: low-friction capture,
a clear "what now?" view, and dopamine-positive feedback loops that make starting (and
finishing) tasks rewarding.

> **Status:** Early scaffold. The stack, tooling, and project conventions are in place;
> feature modules and the database schema are being built out. Expect breaking changes.

## Features

Planned MVP modules:

- **Tasks** — capture and complete tasks with a focused "today" view.
- **Quick Capture** — a frictionless braindump inbox so a thought never blocks the
  current task.
- **Today** — an at-a-glance agenda plus a daily **habit** tracker.
- **Gamification**
  - **XP & levels** earned by completing tasks and habits.
  - **Rewards shop** — spend earned points on rewards you define for yourself.
  - **Dopamine Menu** — a curated menu of healthy, energizing activities to reach for
    instead of doomscrolling.

## Tech stack

| Layer        | Choice                                                            |
| ------------ | ----------------------------------------------------------------- |
| Framework    | [Next.js 16](https://nextjs.org) (App Router, React 19)           |
| Language     | TypeScript                                                        |
| Styling      | Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com) (Base UI)    |
| Database     | PostgreSQL                                                        |
| ORM          | [Prisma 7](https://www.prisma.io) (with the `pg` driver adapter)  |
| Auth         | [Auth.js v5](https://authjs.dev) (email + password / credentials) |
| Deployment   | Docker Compose, self-hosted, exposed via Cloudflare Tunnel        |

## Architecture

This project is designed to be **fully self-hosted on a personal homelab** — no
managed cloud services required. The intended runtime topology:

```
                 Internet
                    │
            Cloudflare Tunnel
                    │
            ┌───────▼────────┐
            │  cloudflared   │   (sidecar, no inbound ports opened)
            └───────┬────────┘
                    │
            ┌───────▼────────┐        ┌──────────────┐
            │  Next.js app   │ ─────▶ │  PostgreSQL  │
            │  (standalone)  │        │              │
            └────────────────┘        └──────────────┘
```

All services run in Docker Compose on the homelab; the only path in from the internet
is through the Cloudflare Tunnel, so no firewall ports need to be opened.

## Getting started (local development)

### Prerequisites

- [Node.js](https://nodejs.org) 22+
- [pnpm](https://pnpm.io) 10+ (this repo pins the version via `packageManager`)
- A PostgreSQL instance (local install, or `docker run`)

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env
#    Then edit .env — at minimum set DATABASE_URL and AUTH_SECRET.
#    Generate an auth secret with:
npx auth secret

# 3. Apply the database schema and generate the Prisma client
pnpm prisma migrate dev
pnpm prisma generate

# 4. Seed the initial admin user (reads ADMIN_EMAIL / ADMIN_PASSWORD from .env)
pnpm prisma db seed

# 5. Start the dev server
pnpm dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

### Environment variables

All configuration is via environment variables. See [`.env.example`](./.env.example)
for the full, documented list. `.env` is git-ignored; never commit real secrets.

## Project structure

```
src/
  app/          # Next.js App Router routes, layouts, pages
  components/   # React components (ui/ holds shadcn primitives)
  lib/          # Shared utilities, db client, auth config
  hooks/        # Custom React hooks
prisma/         # Prisma schema, migrations, seed script
```

Per-folder TypeScript path aliases are configured in `tsconfig.json`:

| Alias          | Path              |
| -------------- | ----------------- |
| `@/*`          | `src/*`           |
| `@app/*`       | `src/app/*`       |
| `@components/*`| `src/components/*`|
| `@lib/*`       | `src/lib/*`       |
| `@hooks/*`     | `src/hooks/*`     |

## Deployment

> Docker Compose and Cloudflare Tunnel configuration are planned and not yet committed.

The target deployment is a single `docker compose up` on the homelab that brings up the
Next.js app, PostgreSQL, and a `cloudflared` sidecar bound to a Cloudflare Tunnel. The
app will be built with Next.js [standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
for a small production image.

## Contributing

This is a personal project shared openly. Issues and pull requests are welcome — please
open an issue to discuss substantial changes first.

## AI assistance disclaimer

Parts of this project were developed with the assistance of
[Claude](https://www.anthropic.com/claude) (via Claude Code). All AI-generated code and
configuration has been reviewed by a human maintainer before inclusion.

## License

[MIT](./LICENSE) © Muhammad Ariff Taha
