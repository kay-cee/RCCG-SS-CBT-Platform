# CBT Quiz Platform — Setup Guide

## Phase 1: Core MVP

### Prerequisites
- Node.js 18+
- PostgreSQL database (local or hosted)

### 1. Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Key variables:
- `DATABASE_URL` — your PostgreSQL connection string  
  e.g. `postgresql://user:password@localhost:5432/cbt_platform`
- `JWT_SECRET` — any long random string (used for candidate tokens)
- `ADMIN_SESSION_SECRET` — any long random string (used for admin sessions)
- `NEXT_PUBLIC_APP_URL` — your deployment URL (e.g. `http://localhost:3000`)
- Email settings — see `.env.example` for Gmail or Mailgun options

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

Push the schema to your database and seed default data:

```bash
npm run setup
```

This creates all tables and seeds:
- 10 default zones (Lagos Zone 1–3, Abuja, Port Harcourt, etc.)
- A default super admin: `admin@cbt.local` / `Admin@1234`

**Change the default password immediately after first login.**

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/admin/login`.

### 5. First Login

1. Go to `/admin/login`
2. Login with `admin@cbt.local` / `Admin@1234`
3. Change your password via profile settings

---

## Deployment (Railway / Render / Heroku)

1. Provision a PostgreSQL database
2. Set environment variables in your hosting dashboard
3. Deploy the app
4. Run `npm run setup` once to initialise the database (or use Railway's deploy hooks)

### Railway (Recommended)

```bash
npm install -g @railway/cli
railway login
railway init
railway add postgresql
railway up
```

---

## Project Structure

```
src/
├── app/
│   ├── quiz/[token]/          # Candidate quiz flow
│   │   ├── page.tsx           # Token landing (auto-redirect)
│   │   ├── register/          # Registration form
│   │   ├── start/             # Quiz instructions
│   │   ├── take/              # Quiz interface
│   │   └── result/            # Score & answer review
│   ├── admin/
│   │   ├── login/             # Admin login
│   │   └── (dashboard)/       # Protected admin area
│   │       ├── page.tsx       # Dashboard home
│   │       ├── quizzes/       # Quiz management
│   │       └── candidates/    # Candidate overview
│   └── api/                   # REST API routes
├── components/
│   ├── ui/                    # Base UI components
│   └── admin/                 # Admin-specific components
├── lib/
│   ├── db.ts                  # Prisma client
│   ├── auth.ts                # JWT + bcrypt helpers
│   ├── email.ts               # Email sending
│   ├── pdf-parser.ts          # PDF question extraction
│   └── utils.ts               # Shared utilities
└── generated/prisma/          # Generated Prisma client
```

## Phase 2 Roadmap (Not yet implemented)

- Fill-in-the-gap (FITG) question type with fuzzy matching
- Analytics dashboard (score distribution by Zone, KPI cards)
- Manual FITG score override by admin
- Export results to CSV/Excel

## Phase 3 Roadmap

- Question bank (reuse questions across quizzes)
- Advanced scheduling
- Admin score override
- Data export
