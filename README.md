# CakeCart 🎂
### Production-Ready Artisan Bakery Ordering Platform with Capacity Engine & Pickup Slots

CakeCart is a modern, high-performance home-bakery web application designed to eliminate overbooking and streamline artisan cake orders. Built with **Next.js 16 (App Router)**, **Tailwind CSS**, **Neon Serverless PostgreSQL**, **Drizzle ORM**, and secure **httpOnly cookie sessions**.

---

## 🌟 Key Features

### Agent 1 - App Experience
- **Artisan Storefront & Catalog**: Explore handcrafted cakes filtered by category, flavour, dietary tag (Eggless, Gluten-Free, Nut-Free, Vegan), and price.
- **Dynamic Cake Customizer**:
  - Live size selection (6" Petite, 8" Classic, 10" Celebration) with dynamic pricing.
  - Flavour infusion selections.
  - Custom piped message plaque strictly capped at 40 characters with automatic fee calculation ($3.00).
- **Pickup Scheduler & Capacity Calendar**:
  - Visual 14-day oven capacity indicators.
  - Enforced minimum 48-hour advance baking notice on client and server.
  - 30-minute pickup slot selector with live remaining spot counters.
- **Collection Pass with Dynamic QR Code**: High-resolution SVG/Canvas pickup pass for rapid collection verification at the atelier.
- **24-Hour Cancellation Window**: Self-service order cancellation for customers with strict 24-hour advance cut-off enforcement.
- **Baker Command Atelier**:
  - Daily baking queue organized by pickup date and collection window.
  - One-click workflow status transitions: `CONFIRMED` $\to$ `BAKING` $\to$ `READY` $\to$ `COLLECTED`.
  - Inline daily capacity editor and date blackout / closure toggles.

### Agent 2 - Database & Concurrency Engine
- **Neon PostgreSQL & Drizzle ORM**: Relational schema across 14 tables with strict integrity constraints, UUID primary keys, and integer minor units for currency.
- **Row-Level ACID Locking**: Orders execute inside transactions with `SELECT ... FOR UPDATE` row locks on `daily_capacity` and `pickup_slots`.
- **10-Minute Temporary Capacity Holds**: Unpaid checkout reservations expire automatically after 10 minutes.
- **Automated Hold Release Cron**: Protected `/api/cron/release-holds` endpoint scheduled via Vercel Cron.
- **Payment Idempotency**: Cryptographic idempotency keys prevent duplicate charges and double order creation.

### Agent 3 - QA & Resilience Test Suite
- Comprehensive automated test harness (`npm run test`) validating:
  1. Database migrations and clean seed.
  2. Authentication and password security.
  3. Minimum 48-hour lead time rejection.
  4. Closed date rejection.
  5. Custom message 40-character limit enforcement.
  6. **Concurrent race condition (last available cake ordered by two parallel sessions: only one succeeds, capacity never goes negative)**.
  7. Expired hold release and idempotency.
  8. Payment confirmation and duplicate webhook handling.
  9. 24-hour cancellation cut-off rules.
  10. Baker status progression workflow.

---

## 🚀 Quick Start & Local Setup

### 1. Prerequisites
- **Node.js**: v18+ or v20+ / v24+
- **npm** or **pnpm**

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
*(If `DATABASE_URL` is omitted locally, CakeCart automatically runs against its built-in embedded PostgreSQL engine for zero-friction local development and testing).*

### 4. Run Database Migrations & Seed Data
```bash
# Apply schema migrations
npm run db:migrate

# Seed sample cakes, options, 14 days of capacity, and demo accounts
npm run db:seed
```

### 5. Start Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Demo Accounts

| Role | Email | Password |
|---|---|---|
| **Head Baker** | `baker@cakecart.com` | `BakerPassword123!` |
| **Customer** | `customer@example.com` | `CustomerPassword123!` |

*(One-click demo login buttons are provided on the `/login` page).*

---

## 🧪 Running Automated QA Tests

Execute the automated test suite covering concurrent race conditions, hold releases, and constraint checks:

```bash
npm run test
```

Expected output:
```
============================================================
🧪 CAKECART QA AGENT - COMPREHENSIVE AUTOMATED TEST HARNESS
============================================================
  ✓ PASS: Database Migrations and Seed Execution
  ✓ PASS: User Authentication & Password Integrity
  ✓ PASS: Minimum 48-Hour Lead Time Enforcement
  ✓ PASS: Closed Bakery Date Rejection on Server
  ✓ PASS: Custom Message 40-Character Limit Rule
  ✓ PASS: Concurrent Race Condition: Only 1 order succeeds for last cake
  ✓ PASS: Expired Holds Release Routine & Idempotency
  ✓ PASS: Payment Confirmation with Idempotency Key
  ✓ PASS: Order Cancellation 24-Hour Cut-off Enforcement
  ✓ PASS: Baker Status Workflow (BAKING -> READY -> COLLECTED)
============================================================
🎉 ALL 10/10 QA TESTS PASSED!
============================================================
```

---

## 🚢 Deployment to Vercel

1. **Push to GitHub / GitLab**.
2. **Import Project to Vercel**:
   - Framework preset: `Next.js`
   - Root directory: `./`
3. **Provision Neon PostgreSQL via Vercel Marketplace**:
   - In your Vercel Project Dashboard, navigate to **Storage** $\to$ **Connect Store** $\to$ **Neon**.
   - Vercel automatically injects `DATABASE_URL` (pooled connection).
4. **Configure Environment Variables in Vercel**:
   - `SESSION_SECRET`: 32+ character random string.
   - `CRON_SECRET`: Random secret matching cron invocations.
   - `BLOB_READ_WRITE_TOKEN`: (Optional) From Vercel Blob store.
5. **Deploy**:
   - `vercel.json` will automatically schedule `/api/cron/release-holds` every 5 minutes (`*/5 * * * *`).
   - Run `npm run db:migrate` and `npm run db:seed` during first deployment or in Vercel build step:
     ```bash
     npm run db:migrate && npm run db:seed && npm run build
     ```

---

## 📁 Project Structure

```
├── drizzle/                    # Generated SQL migrations (14 tables)
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/
│   │   │   ├── auth/           # Login, register, logout, session
│   │   │   ├── baker/          # Order queue, status, capacity management
│   │   │   ├── capacity/       # 14-day capacity & pickup slots
│   │   │   ├── cron/           # Expired hold release endpoint
│   │   │   ├── orders/         # Order creation, QR pass, cancellation
│   │   │   ├── payments/       # Process payment & test webhook
│   │   │   ├── products/       # Menu catalog & filter engine
│   │   │   └── upload/         # Vercel Blob file handler
│   │   ├── cart/               # Basket & price breakdown
│   │   ├── checkout/           # 10-min countdown timer & payment
│   │   ├── dashboard/          # Baker management atelier
│   │   ├── login/              # Authentication & test credentials
│   │   ├── menu/               # Cake catalog & [slug] customizer
│   │   ├── my-orders/          # Customer order history
│   │   ├── orders/[orderNumber]# Confirmation & QR collection pass
│   │   ├── pickup/             # 14-day schedule & 30-min slot picker
│   │   ├── layout.tsx          # Root layout & providers
│   │   └── page.tsx            # Handcrafted hero & capacity spotlight
│   ├── components/             # Reusable UI components (Navbar, Footer, etc.)
│   ├── context/                # AuthContext & CartContext
│   ├── db/                     # Drizzle schema, connection, migrations, seed
│   └── lib/                    # Transaction engine & format helpers
├── tests/                      # Automated QA test harness
└── vercel.json                 # Vercel Cron configuration
```

---

## 🛡️ License
Private project developed for CakeCart Artisan Bakery.
