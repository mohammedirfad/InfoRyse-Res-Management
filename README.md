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
# Fill in your Supabase DATABASE_URL and SESSION_SECRET
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

---

*Built for InfoRyse IT Solutions — Hospitality SaaS Platform*
