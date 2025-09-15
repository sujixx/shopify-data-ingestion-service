1) Project Overview

A React (Create React App) dashboard that authenticates users, connects a Shopify store, ingests data, and visualizes business KPIs:

Totals: Customers, Orders, Revenue, AOV

Orders by Day: Date-range chart

Top 5 Customers: By spend

Store Connect: Shopify OAuth flow + one-click sync/backfill

The app is resilient to backend shape: the frontend reads /api/analytics/dashboard as the single source of truth and derives chart/table data if dedicated endpoints are missing.

2) Architecture (High-Level)
+-----------------------------+           +------------------------------+
|           Browser           |  HTTPS    |            Vercel            |
|  React Dashboard (CRA)      +---------->+  Static hosting + rewrites   |
|  AuthContext + Axios        |           |  /api/* -> Railway backend   |
+--------------+--------------+           +--------------+---------------+
               ^                                             |
               | JWT (Bearer)                                | HTTPS /api/*
               |                                             v
+--------------+--------------------+        +------------------------------+
|        Railway (Node/Express)     |        |         Shopify APIs         |
|  /api/auth, /api/analytics,       |        | OAuth, Orders, Customers,    |
|  /api/shopify/...                 |<------>+ Products, Webhooks           |
|  Prisma ORM + DB (MySQL/Postgres) |        +------------------------------+
+-----------------------------------+


Vercel serves the React app and proxies /api/* to Railway via vercel.json rewrites (no CORS headache on the browser).

Railway hosts an Express API (JWT auth). Prisma talks to your SQL database.

Shopify is the data source: OAuth to get tokens, periodic/webhook-based ingestion.

3) Assumptions

Authentication: JWT via /api/auth/login (email/password).

Multi-tenant: Each user belongs to a tenant. A tenant can have a shopifyDomain.

Single source of truth: Frontend primarily calls /api/analytics/dashboard.

Currency: Shopify store currency (e.g. USD). The frontend formats numbers using Intl.NumberFormat.

DB: SQL with Prisma models for User, Tenant, Customer, Order, OrderItem, Product.

Shopify scopes: at least read_orders, read_customers, read_products, write_webhooks.

4) Tech Stack

Frontend: React 18 (CRA), Recharts, React Router, Axios, date-fns

Backend: Node.js (Express), Prisma ORM, JWT, Shopify OAuth, Webhooks

Infra: Vercel (frontend), Railway (backend + DB)

5) Setup (Local)
5.1 Backend (Railway/local)

Clone the repo and navigate to backend:

cd backend
npm install


Create .env:

PORT=8080
JWT_SECRET=supersecret
DATABASE_URL=<your_database_url>
ALLOWED_ORIGINS=https://<your-vercel-domain>,http://localhost:3000

# Shopify
SHOPIFY_API_KEY=<from-partner-dashboard>
SHOPIFY_API_SECRET=<from-partner-dashboard>
SHOPIFY_SCOPES=read_products,read_orders,read_customers,write_webhooks
SHOPIFY_APP_URL=https://<your-backend-host>/api/shopify


Prisma:

npx prisma migrate deploy
npx prisma generate


Run:

npm run start
# or npm run dev

5.2 Frontend (Vercel/local)

Navigate to frontend:

cd frontend
npm install


Create .env:

REACT_APP_API_URL=https://<your-backend-host>
REACT_APP_SHOPIFY_APP_URL=https://<your-backend-host>/api/shopify


vercel.json (in frontend/):

{
  "version": 2,
  "builds": [
    { "src": "package.json", "use": "@vercel/static-build", "config": { "distDir": "build" } }
  ],
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://<your-backend-host>/api/:path*" },
    { "source": "/(.*)", "destination": "/" }
  ]
}


Run locally:

npm start

6) Deployment
6.1 Railway (Backend)

Add all environment variables from .env.

Expose the service; note the public URL as <your-backend-host>.

6.2 Vercel (Frontend)

Project root: frontend/

Environment Variables in Vercel:

REACT_APP_API_URL=https://<your-backend-host>

REACT_APP_SHOPIFY_APP_URL=https://<your-backend-host>/api/shopify

Build command: npm run build

Output directory: build

Ensure vercel.json is present (rewrites, not routes).

7) API Endpoints (Key)

All endpoints are under /api and require Authorization: Bearer <JWT> unless noted.

7.1 Auth

POST /api/auth/login

{ "email": "admin@demo.com", "password": "password123" }


200 OK

{ "success": true, "token": "<jwt>", "user": { "email": "admin@demo.com" }, "tenant": { "id": "..." } }

7.2 Shopify

POST /api/shopify/connect

{ "shopifyDomain": "your-store.myshopify.com" }


GET /api/shopify/auth (browser redirect)

GET /api/shopify/auth/callback (Shopify redirects here)

POST /api/shopify/sync

{ "resources": ["customers","orders","products"] }


200 OK

{ "success": true, "message": "Sample data synced" }

7.3 Analytics

GET /api/analytics/dashboard?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
200 OK

{
  "success": true,
  "data": {
    "overview": {
      "totalCustomers": 3,
      "totalOrders": 7,
      "totalRevenue": 60309.97,
      "avgOrderValue": 8615.71
    },
    "today": { "orders": 5, "revenue": 59405 },
    "recentOrders": [ /* latest 10 orders with customer */ ],
    "topCustomers": [ /* top 5 by totalSpent */ ],
    "dailyRevenue": [
      { "date": "2025-09-14T00:00:00.000Z", "revenue": 904.97, "orderCount": 2 },
      { "date": "2025-09-15T00:00:00.000Z", "revenue": 59405,  "orderCount": 5 }
    ]
  }
}


GET /api/analytics/customers?page=1&limit=20&search=abc
200 OK

{ "success": true, "data": { "customers": [ ... ], "pagination": { "page":1, "limit":20, "total": 42, "pages":3 } } }


GET /api/analytics/orders?page=1&limit=20&status=CONFIRMED
200 OK

{ "success": true, "data": { "orders": [ ... ], "pagination": { ... } } }

8) Data Model (Prisma/SQL)

Tenant

id (uuid), name, shopifyDomain, createdAt

User

id (uuid), email, passwordHash, tenantId (FK), createdAt

Customer

id, shopifyCustomerId, email, firstName, lastName, phone, totalSpent, ordersCount, lastOrderDate, tenantId (FK), createdAt

Order

id, shopifyOrderId, orderNumber, email, totalPrice, currency, status, processedAt, tenantId (FK), customerId (FK|null), createdAt, updatedAt

OrderItem

id, orderId (FK), title, sku, quantity, price, totalPrice

Product

id, shopifyProductId, title, price, vendor, status, tenantId (FK)

Daily Revenue is produced via a SQL GROUP BY DATE(createdAt) in /api/analytics/dashboard.
If you switch databases (e.g., Postgres), use DATE("createdAt") / date_trunc('day', ...) accordingly.

9) Using the App (Happy Path)

Login with your credentials → JWT saved to localStorage.

Connect Store: enter your-store.myshopify.com → OAuth → callback confirms installation.

Backfill/Sync: run once to populate DB:

// DevTools Console on your Vercel domain
fetch('/api/shopify/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('token') },
  body: JSON.stringify({ resources: ['customers', 'orders', 'products'] })
}).then(r=>r.json()).then(console.log);


Dashboard updates: cards, orders-by-day, top customers.

10) Troubleshooting

401 in DevTools / blank dashboard
Ensure you’re logged in. Clear stale auth in console:

localStorage.removeItem('token'); localStorage.removeItem('user'); location.reload();


CORS on Vercel
Use rewrites in vercel.json so the browser only talks to Vercel; Vercel forwards to Railway. Don’t use routes + rewrites together.

Manifest 401
Happens if your backend intercepts /manifest.json. The React app’s manifest is served from Vercel root; do not proxy it. Keep the second rewrite:

{ "source": "/(.*)", "destination": "/" }


Case-sensitivity / imports
Use barrel files (index.js) and import folders:
import Dashboard from './components/Dashboard';

ESLint hook errors in CI
Don’t call hooks conditionally; avoid early returns before hooks. We fixed Dashboard to guard auth before using hooks or via the ProtectedRoute.

11) Next Steps to Productionize

Webhooks & Sync: Make ingestion fully webhook-driven with retries & idempotency.

Jobs: Queue (BullMQ) for backfills; rate-limit Shopify API calls.

Observability: Structured logs, metrics, error tracking (Sentry).

RBAC & Multi-Tenant Isolation: Enforce tenant row-level security.

Pagination & Indexes: Add DB indexes on tenantId, createdAt, shopify*Id.

Secrets: Use Vercel/Railway secrets managers.

Tests: Unit + integration for analytics aggregations.

Security: Rotate signing keys; add 2FA if needed.

12) Known Limitations

Derived fields: Top customers may depend on totalSpent/ordersCount consistency—recompute after backfills.

Date grouping: SQL DATE(createdAt) differs across engines; adjust if you change DB.

Currency: Frontend formats based on store currency; multi-currency not covered.

Health route: /api/health may not exist; verify your backend.

Sample data: If tenants/users point to a “demo” tenant, metrics can look mismatched—attach the user to the real tenant.

13) Quick Demo Script (7 minutes)

30s Intro: goal, stack, multi-tenant + Shopify.

Login (JWT).

Connect Store → OAuth success message.

Backfill (Console) → refresh → cards update.

Orders by Day date range.

Top 5 Customers drill-down.

Wrap-up: productionization plan & trade-offs.

14) License

For assignment/demo use. Adapt freely.
