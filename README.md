# Restaurant Menu - Full-Stack Nuxt 4 Application

A modern, production-ready full-stack web application powered by **Nuxt 4**, **Vue 3**, **Nitro**, **Cloudflare Pages / Workers**, and **Drizzle ORM (Cloudflare D1)**.

---

## 🏗️ Architecture Overview

```text
Restaurant-menu/
├── app/                  # Frontend UI (Pages, Components, Composables, Layouts)
│   ├── components/       # Reusable Vue components
│   ├── composables/      # Composables (useApi, useAuth, useAnalytics, etc.)
│   ├── layouts/          # Nuxt layouts
│   └── pages/            # Nuxt pages (Client & Admin)
├── server/               # Backend API & Server Engine (Nitro + Hono)
│   ├── api/              # API endpoints (e.g. /api/menu, /api/[...].ts)
│   └── backend/          # Backend core (controllers, db, middleware, services)
│       └── db/           # Drizzle ORM schema & database connection
├── shared/               # Shared TypeScript types, DTOs, & Zod schemas
├── drizzle/              # Drizzle ORM migration scripts & SQL seed
├── public/               # Static assets
├── nuxt.config.ts        # Nuxt 4 configuration
├── wrangler.jsonc        # Cloudflare Workers / Pages configuration
└── package.json          # Single project dependencies & scripts
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Development Mode
```bash
pnpm dev
```
Your full-stack application will be live at `http://localhost:3000`.

### 3. Database Commands
```bash
# Generate new Drizzle migrations
pnpm db:generate

# Apply migrations locally
pnpm db:migrate:local

# Apply migrations to Cloudflare D1 (Production)
pnpm db:migrate:prod

# Seed local database
pnpm db:seed:local
```

### 4. Build & Deploy
```bash
# Typecheck
pnpm typecheck

# Build for production
pnpm build

# Deploy to Cloudflare Pages
pnpm deploy
```
