# InfoRyse — Digital Menu & QR Ordering SaaS

A multi-tenant QR-based digital menu and ordering platform for restaurants and cafés.

**Tech Stack:** Next.js 14 · TypeScript · PostgreSQL (Supabase) · Prisma ORM · Tailwind CSS

---

## Three Panels

| Panel | URL | Who |
|---|---|---|
| **Customer** | `/r/{slug}/{qrToken}` | Guests scanning QR codes |
| **Restaurant Admin** | `/admin/*` | Restaurant owners & staff |
| **Super Admin** | `/super/*` | InfoRyse platform team |

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Fill in your Supabase transaction-pool DATABASE_URL and SESSION_SECRET
```

### 3. Run database migrations
```bash
npx prisma migrate dev --name init
# or for Supabase pooler:
npx prisma@5.18.0 db push
```

### 4. Seed demo data
```bash
npm run seed
```

### 5. Start development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Vercel database connection

For Vercel runtime traffic, set `DATABASE_URL` to the Supabase **Transaction pooler** URI (port `6543`) with `pgbouncer=true` and `connection_limit=1`. Set `DIRECT_URL` to the Supabase direct database URI for Prisma migrations (or the Session pooler URI on port `5432` when the direct endpoint is unreachable). Do not use a Session pooler connection for high-concurrency serverless runtime traffic. Apply all checked-in migrations with `npx prisma migrate deploy` before switching production traffic.

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Super Admin | `superadmin@inforyse.com` | `ChangeMe123!` |
| Restaurant Owner | `owner@riversidecafe.com` | `ChangeMe123!` |
| Restaurant Staff | `staff@riversidecafe.com` | `ChangeMe123!` |

> **OTP:** In dev mode a yellow banner shows the OTP code on-screen (no email setup needed).

---

## Key Features

- 📱 **Mobile-first QR ordering** — customers scan, browse, order without an app
- 🏪 **Multi-tenant** — one codebase, one database, unlimited restaurants
- 🔐 **Secure** — table-occupied gating, IP rate limiting, idempotency, server-side price validation
- 🍽️ **Restaurant Admin** — full menu/table/order/analytics management
- 🔔 **Live orders** — smart polling with sound alerts, no dropped orders
- 🧾 **Printable bills** — KOT + customer bill from the order panel
- ⚙️ **Tax settings** — configurable tax name and percentage per restaurant
- 📊 **Analytics** — revenue trends, top dishes, peak hours

---

## Project Structure

```
src/
├── app/
│   ├── r/[slug]/[qrToken]/   # Customer ordering flow
│   ├── admin/                 # Restaurant admin panel
│   └── super/                 # Super admin panel
├── components/                # Shared UI components
├── lib/                       # Auth, DB, rate limiting, utils
└── app/api/                   # All API routes
prisma/
├── schema.prisma              # Database schema
└── seed.ts                    # Demo data
```

---

## Production Deployment

1. Set all env vars (see `.env.example`)
2. Run `npx prisma migrate deploy`
3. Run `npm run seed` (first time only)
4. Run `npm run build && npm start`

**Recommended:** Vercel (frontend) + Supabase (database)

### Vercel production checklist

- Set `NEXT_PUBLIC_APP_URL` to the canonical HTTPS production domain. QR URLs also use Vercel's production domain as a fallback.
- Keep Supabase and Vercel in nearby regions. The Prisma connection pool defaults to one connection per Vercel function instance to avoid exhausting Supabase's connection limit.
- Create a public Supabase Storage bucket named `restaurant-images` with a 5 MB file limit and JPEG, PNG, WebP, and GIF MIME types. The app creates short-lived signed upload URLs server-side; keep `SUPABASE_SERVICE_ROLE_KEY` private and never prefix it with `NEXT_PUBLIC_`.
- Apply database changes before promoting the new app: `npx prisma migrate deploy`. This release includes a migration that merges duplicate active categories while retaining their menu items, repairs duplicate table labels, and adds uniqueness constraints.
- Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET` in local and Vercel environments, along with `DATABASE_URL`, `SESSION_SECRET`, and email delivery credentials. Preview deployments should use a separate database if they run migrations.
- `SESSION_SECRET` must be a random value of at least 32 characters; production startup/build now fails closed if it is missing or too short.

Image upload sends files directly to Supabase Storage using a time-limited upload token; Vercel's local filesystem is not used for persistent image storage. Supabase Storage delivers stored assets through its CDN. The Free plan currently includes 1 GB of storage and 10 GB of monthly bandwidth; monitor usage and plan for paid capacity if the restaurant fleet exceeds those quotas.

---

*Built for InfoRyse IT Solutions — Hospitality SaaS Platform*
