# Shopify Analytics Dashboard

A React-based dashboard that authenticates users, connects to Shopify stores, ingests data, and visualizes business KPIs including totals, daily revenue charts, and top customers.

## 🚀 Features

- **Authentication**: JWT-based user authentication
- **Shopify Integration**: OAuth flow with one-click sync/backfill
- **Analytics Dashboard**: 
  - Overview metrics (Customers, Orders, Revenue, AOV)
  - Orders by day chart with date range selection
  - Top 5 customers by spend
- **Multi-tenant Architecture**: Each user belongs to a tenant with Shopify store connection
- **Responsive Design**: Built with React and Recharts for data visualization

## 🏗️ Architecture

```
┌─────────────────────────────┐           ┌──────────────────────────────┐
│           Browser           │  HTTPS    │            Vercel            │
│  React Dashboard (CRA)      ├──────────►│  Static hosting + rewrites   │
│  AuthContext + Axios        │           │  /api/* -> Railway backend   │
└──────────────┬──────────────┘           └──────────────┬───────────────┘
               │                                         │
               │ JWT (Bearer)                            │ HTTPS /api/*
               │                                         ▼
┌──────────────┴────────────────┐        ┌──────────────────────────────┐
│        Railway (Node/Express) │        │         Shopify APIs         │
│  /api/auth, /api/analytics,   │◄──────►│ OAuth, Orders, Customers,    │
│  /api/shopify/...             │        │ Products, Webhooks           │
│  Prisma ORM + DB              │        └──────────────────────────────┘
└───────────────────────────────┘
```

## 🛠️ Tech Stack

**Frontend:**
- React 18 (Create React App)
- Recharts for data visualization
- React Router for navigation
- Axios for API calls
- date-fns for date handling

**Backend:**
- Node.js with Express
- Prisma ORM
- JWT authentication
- Shopify OAuth integration

**Infrastructure:**
- Vercel (frontend hosting)
- Railway (backend + database)

## ⚙️ Setup

### Prerequisites

- Node.js 16+
- Shopify Partner account and app
- Database (MySQL/PostgreSQL)

### Backend Setup (Railway/Local)

1. Navigate to backend directory:
```bash
cd backend
npm install
```

2. Create `.env` file:
```env
PORT=8080
JWT_SECRET=supersecret
DATABASE_URL=<your_database_url>
ALLOWED_ORIGINS=https://<your-vercel-domain>,http://localhost:3000

# Shopify
SHOPIFY_API_KEY=<from-partner-dashboard>
SHOPIFY_API_SECRET=<from-partner-dashboard>
SHOPIFY_SCOPES=read_products,read_orders,read_customers,write_webhooks
SHOPIFY_APP_URL=https://<your-backend-host>/api/shopify
```

3. Setup Prisma:
```bash
npx prisma migrate deploy
npx prisma generate
```

4. Start the server:
```bash
npm run start
# or npm run dev
```

### Frontend Setup (Vercel/Local)

1. Navigate to frontend directory:
```bash
cd frontend
npm install
```

2. Create `.env` file:
```env
REACT_APP_API_URL=https://<your-backend-host>
REACT_APP_SHOPIFY_APP_URL=https://<your-backend-host>/api/shopify
```

3. Create `vercel.json` in frontend directory:
```json
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
```

4. Start the development server:
```bash
npm start
```

## 🚀 Deployment

### Railway (Backend)

1. Connect your repository to Railway
2. Add all environment variables from your `.env` file
3. Deploy and note the public URL as `<your-backend-host>`

### Vercel (Frontend)

1. Connect your repository to Vercel
2. Set project root to `frontend/`
3. Add environment variables:
   - `REACT_APP_API_URL=https://<your-backend-host>`
   - `REACT_APP_SHOPIFY_APP_URL=https://<your-backend-host>/api/shopify`
4. Build command: `npm run build`
5. Output directory: `build`
6. Ensure `vercel.json` is present in the frontend directory

## 📡 API Endpoints

All endpoints require `Authorization: Bearer <JWT>` unless noted.

### Authentication
```
POST /api/auth/login
Body: { "email": "admin@demo.com", "password": "password123" }
Response: { "success": true, "token": "<jwt>", "user": {...}, "tenant": {...} }
```

### Shopify Integration
```
POST /api/shopify/connect
Body: { "shopifyDomain": "your-store.myshopify.com" }

GET /api/shopify/auth (OAuth redirect)
GET /api/shopify/auth/callback (OAuth callback)

POST /api/shopify/sync
Body: { "resources": ["customers","orders","products"] }
Response: { "success": true, "message": "Sample data synced" }
```

### Analytics
```
GET /api/analytics/dashboard?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
Response: {
  "success": true,
  "data": {
    "overview": { "totalCustomers": 3, "totalOrders": 7, ... },
    "dailyRevenue": [...],
    "topCustomers": [...],
    "recentOrders": [...]
  }
}

GET /api/analytics/customers?page=1&limit=20&search=abc
GET /api/analytics/orders?page=1&limit=20&status=CONFIRMED
```

## 🗄️ Data Model

### Core Models (Prisma)

- **Tenant**: Multi-tenant organization with Shopify store
- **User**: Authentication and tenant association
- **Customer**: Shopify customer data with spending metrics
- **Order**: Order data with items and customer relationship
- **OrderItem**: Individual line items within orders
- **Product**: Shopify product catalog

## 🎯 Usage

### Happy Path Workflow

1. **Login**: Authenticate with your credentials → JWT saved to localStorage
2. **Connect Store**: Enter `your-store.myshopify.com` → OAuth flow → installation confirmation
3. **Sync Data**: Run initial backfill to populate database:

```javascript
// In browser DevTools Console
fetch('/api/shopify/sync', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json', 
    Authorization: 'Bearer ' + localStorage.getItem('token') 
  },
  body: JSON.stringify({ resources: ['customers', 'orders', 'products'] })
}).then(r=>r.json()).then(console.log);
```

4. **View Dashboard**: Analytics cards, charts, and tables update automatically

## 🔧 Troubleshooting

### 401 Unauthorized / Blank Dashboard
Ensure you're logged in. Clear stale authentication:
```javascript
localStorage.removeItem('token');
localStorage.removeItem('user');
location.reload();
```

### CORS Issues on Vercel
Use `rewrites` in `vercel.json` (not `routes`) so the browser only communicates with Vercel, which forwards requests to Railway.

### Manifest 401 Errors
Ensure your backend doesn't intercept `/manifest.json`. Keep the catch-all rewrite:
```json
{ "source": "/(.*)", "destination": "/" }
```

## 🚀 Production Considerations

### Next Steps to Productionize

- **Webhooks**: Implement real-time webhook-driven data ingestion
- **Job Queues**: Add BullMQ for background processing and rate limiting
- **Observability**: Structured logging, metrics, error tracking (Sentry)
- **Security**: RBAC, multi-tenant row-level security, key rotation
- **Performance**: Database indexes, pagination, caching
- **Testing**: Unit and integration tests for analytics aggregations

### Current Limitations

- **Derived Fields**: Customer totals may require recomputation after backfills
- **Database Portability**: SQL date functions differ across engines
- **Currency**: Single currency support (store default)
- **Sample Data**: Demo data may cause metric inconsistencies

## 🎬 Quick Demo Script (7 minutes)

1. **Intro** (30s): Explain goal, tech stack, multi-tenant architecture
2. **Authentication**: Login with JWT
3. **Store Connection**: OAuth flow demonstration
4. **Data Sync**: Console-based backfill → dashboard refresh
5. **Analytics**: Date range selection, customer drill-down
6. **Wrap-up**: Discuss productionization roadmap

## 📄 License

For assignment/demo use. Adapt freely.

---

**Built with ❤️ using React, Express, and Shopify APIs**
