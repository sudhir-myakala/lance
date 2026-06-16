# AI Freelancer OS — Build Progress

> Last updated: 2026-06-16  
> Plan reference: `AI_Freelancer_OS_Spec_and_Plan.pdf`  
> Current phase: **Week 1–2 — Foundation**

---

## What Changed From the Original Plan

The original spec assumed **Clerk** for authentication. We switched to **manual JWT authentication** for full ownership and zero vendor lock-in. This affected:

| Area                | Original (Clerk)            | Implemented (Manual)                                       |
| ------------------- | --------------------------- | ---------------------------------------------------------- |
| Auth provider       | `@clerk/nextjs` + Clerk SDK | `@nestjs/jwt` + `passport-jwt` + `bcrypt`                  |
| User session        | Clerk managed               | JWT (15 min) + refresh token (30 days, httpOnly cookie)    |
| Multi-tenancy       | Clerk Organizations API     | Custom `orgs` + `memberships` tables in Postgres           |
| Token storage       | Clerk session tokens        | Access token in `localStorage`, refresh in httpOnly cookie |
| Mobile auth         | Clerk Expo SDK              | `POST /auth/refresh` with cookie — Expo-compatible         |
| Extra tables        | None                        | `refresh_tokens` (HMAC-SHA256 indexed)                     |
| Extra Week 1 effort | ~0.5 days                   | +1.5 days (email verify, reset password flows still TODO)  |

---

## Completed Work

### Infrastructure & Tooling

- [x] **Turborepo monorepo** — `apps/web`, `apps/api`, `packages/db`, `packages/ui`, `packages/types`
- [x] **TypeScript** everywhere (strict mode per-package)
- [x] **ESLint + Prettier + Husky** — lint-staged on commit
- [x] **pnpm workspaces** — `pnpm-workspace.yaml` with build approvals for Prisma/bcrypt
- [x] **GitHub** — initial commit pushed

### packages/db (NEW — Week 1 Wed)

- [x] `prisma/schema.prisma` — full Week 1 schema:
  - `orgs` — multi-tenant root
  - `users` — with `passwordHash`, `emailVerifyToken`, `resetToken`/`resetTokenExp`
  - `refresh_tokens` — HMAC-SHA256 indexed, not bcrypt (O(1) lookup)
  - `roles` + `permissions` — CASL-ready
  - `memberships` — user ↔ org ↔ role junction
  - `audit_log` — every mutation target
  - `api_keys` — future use
- [x] Prisma client generated (`pnpm db:generate`)
- [x] Seed script — seeds default roles: `owner`, `admin`, `member`, `viewer`

### apps/api (NestJS) — Week 1 Thu–Fri

- [x] **PrismaModule** (`@Global()`) — available in every module
- [x] **ConfigModule** (`isGlobal: true`) — env vars via `.env`
- [x] **ThrottlerModule** — 60 req/min rate limit globally
- [x] **ValidationPipe** — `whitelist: true`, `forbidNonWhitelisted: true`
- [x] **cookie-parser** middleware
- [x] **CORS** — `credentials: true`, origin from `WEB_URL` env
- [x] **Global API prefix** — all routes under `/api`
- [x] **Auth module** (`/api/auth/*`):
  - `POST /api/auth/register` — creates org + user + owner role, returns JWT + sets httpOnly cookie
  - `POST /api/auth/login` — bcrypt verify, returns JWT + sets httpOnly cookie
  - `POST /api/auth/refresh` — validates refresh token via cookie, returns new access token
  - `POST /api/auth/logout` — revokes refresh token, clears cookie
  - `GET /api/auth/me` — returns full user + org + role (JWT guarded)
- [x] **JwtStrategy** (Passport) — validates bearer token, attaches `{ sub, email, orgId }` to request
- [x] **JwtAuthGuard** — `@UseGuards(JwtAuthGuard)` decorator
- [x] **`@CurrentUser()`** decorator — extracts JWT payload from request

### apps/web (Next.js 14) — Week 1 Sat

- [x] **Tailwind CSS** + dark mode CSS variables
- [x] **axios instance** (`src/lib/api.ts`) — auto-attaches `Authorization: Bearer <token>`, silent token refresh on 401
- [x] **Zustand auth store** (`src/store/auth.store.ts`) — `login`, `register`, `logout`, `hydrate`
- [x] **Next.js middleware** (`src/middleware.ts`) — redirects unauthenticated users away from `/dashboard/*`
- [x] **`(auth)` route group** — centered layout, no sidebar
  - `/login` — email/password form
  - `/register` — full registration (name, org name, email, password)
- [x] **`(app)` route group** — sidebar layout, JWT-protected
  - `/dashboard` — placeholder stat cards
- [x] **Home page** (`/`) — landing placeholder

---

## Pending (Week 1 Remainder)

- [ ] **Email verification** — `GET /api/auth/verify-email?token=xxx` → set `emailVerifiedAt`
- [ ] **Forgot/reset password** — `POST /api/auth/forgot-password` + `POST /api/auth/reset-password`
- [ ] **Postgres RLS policies** — `SET LOCAL app.org_id` per request, RLS on all tenant tables
- [ ] **CASL permissions skeleton** — ability factory reading from `memberships.role.permissions`
- [ ] **First DB migration** — run `pnpm --filter @freelancer-os/db db:migrate` once DB is provisioned
- [ ] **README update** — local dev setup steps

---

## Pending (Week 2)

- [ ] BullMQ setup (Railway workers)
- [ ] Claude + OpenAI SDK clients + `ai_runs`/`ai_messages` tables
- [ ] Vercel AI SDK streaming endpoint
- [ ] Sentry + PostHog
- [ ] Supabase Realtime notifications
- [ ] Audit log middleware

---

## How to Run Locally

### Prerequisites

- Node.js ≥ 20, pnpm ≥ 9
- PostgreSQL running locally (or Supabase project)

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment variables
cp packages/db/.env.example packages/db/.env
cp apps/api/.env.example apps/api/.env
# Edit both files with your DATABASE_URL, JWT_SECRET, REFRESH_TOKEN_SECRET

# 3. Run database migrations (first time)
pnpm --filter @freelancer-os/db db:migrate

# 4. Seed default roles
pnpm --filter @freelancer-os/db db:seed

# 5. Start dev servers
pnpm dev
# Web → http://localhost:3000
# API → http://localhost:3001/api
```

### API Endpoints (available now)

| Method | Path                 | Auth   | Description          |
| ------ | -------------------- | ------ | -------------------- |
| POST   | `/api/auth/register` | Public | Create org + user    |
| POST   | `/api/auth/login`    | Public | Login, get JWT       |
| POST   | `/api/auth/refresh`  | Cookie | Refresh access token |
| POST   | `/api/auth/logout`   | Cookie | Revoke session       |
| GET    | `/api/auth/me`       | Bearer | Get current user     |
| GET    | `/api`               | Public | Health check         |

---

## Architecture Decisions

### Token Strategy

- **Access token**: JWT, 15 min, signed with `JWT_SECRET`, returned in response body, stored in `localStorage`
- **Refresh token**: 40-byte random hex, HMAC-SHA256 hashed with `REFRESH_TOKEN_SECRET` before storage (O(1) lookup vs bcrypt), stored in `refresh_tokens` table, sent as `httpOnly` cookie
- **Why HMAC for refresh tokens, bcrypt for passwords?** Passwords need slow hashing (bcrypt cost 12) to resist offline attacks. Refresh tokens are long random strings — HMAC-SHA256 is fast and cryptographically secure for this use case.

### Multi-tenancy

- Every table that holds org data has `orgId` column
- Row-Level Security (RLS) will enforce tenant isolation at the DB layer (TODO: Week 1 Fri task)
- NestJS sets `SET LOCAL app.org_id` per request after JWT validation

### Auth Flow

```
Register/Login
  → API validates → creates tokens → sets httpOnly refresh_token cookie
  → Returns { accessToken, user } in JSON
  → Web stores accessToken in localStorage

Request
  → Axios attaches Authorization: Bearer <token>
  → API validates JWT → injects user into request

Token expiry (401 response)
  → Axios interceptor calls POST /auth/refresh (cookie sent automatically)
  → Gets new accessToken → retries original request

Logout
  → API revokes refresh token in DB → clears cookie
  → Web clears localStorage
```

---

## File Structure

```
lance/
├── apps/
│   ├── api/                          # NestJS backend
│   │   └── src/
│   │       ├── auth/
│   │       │   ├── dto/              # register.dto.ts, login.dto.ts
│   │       │   ├── auth.controller.ts
│   │       │   ├── auth.module.ts
│   │       │   ├── auth.service.ts
│   │       │   ├── jwt-auth.guard.ts
│   │       │   └── jwt.strategy.ts
│   │       ├── common/
│   │       │   └── decorators/current-user.decorator.ts
│   │       ├── prisma/
│   │       │   ├── prisma.module.ts
│   │       │   └── prisma.service.ts
│   │       ├── app.module.ts
│   │       └── main.ts
│   └── web/                          # Next.js 14 frontend
│       └── src/
│           ├── app/
│           │   ├── (auth)/           # login, register pages
│           │   ├── (app)/            # dashboard (protected)
│           │   ├── layout.tsx
│           │   └── page.tsx
│           ├── lib/api.ts            # axios + interceptors
│           ├── middleware.ts         # route protection
│           └── store/auth.store.ts  # zustand auth state
└── packages/
    ├── db/                           # Prisma schema + client
    │   ├── prisma/
    │   │   ├── schema.prisma
    │   │   └── seed.ts
    │   └── src/index.ts
    ├── ui/                           # Shared React components
    └── types/                        # Shared TypeScript types
```
