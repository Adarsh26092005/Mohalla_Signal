# Mohalla Signal

> **Turning demand that never became a sale into an actionable neighborhood signal.**

---

## 1. What is Mohalla Signal?
**Mohalla Signal** is a community-level demand intelligence and aggregation platform for local kirana and retail merchants. It captures unfulfilled customer demand (items requested but not stocked), matches products deterministically, and aggregates demand across nearby independent merchants without compromising their competitive privacy.

---

## 2. The Core Problem
When a customer walks into a local merchant asking for an unstocked product (e.g., *Organic Ragi Flour* or *Almond Milk*), that demand disappears the moment the customer leaves empty-handed.
- **Merchant Blind Spot**: An individual merchant cannot tell if a missed request is an isolated inquiry or part of a broader shift in local preference.
- **Fragmented Purchasing**: Nearby merchants encounter the same missed requests independently but lack the aggregate demand volume needed to negotiate viable supplier minimum order quantities (MOQs).

---

## 3. The Core Solution
Mohalla Signal bridges this gap:
1. **Quick Demand Capture**: Merchants log missed requests in seconds via quick UI or speech-to-text.
2. **Product Normalization**: Aliases (e.g., *"ragi atta"*, *"finger millet flour"*) map deterministically to standardized catalog items.
3. **Privacy-Preserving Aggregation**: Demand is combined across geographic clusters ($\ge 3$ distinct merchants required before broadcasting a signal).
4. **Actionable Signals**: Merchants see neighborhood demand volume without seeing competitor identities.
5. **Supplier RFQ & Decision**: Merchants review supplier quotes and make an independent **BUY** or **DON'T BUY** decision.
6. **Closing the Loop**: Inquiring customers are notified when products arrive, and sales/outcomes inform future demand models.

---

## 4. Authentication & Authorization Architecture

```
User (Mobile / Web)
        ↓ Authenticates
Firebase Authentication
        ↓ Issues ID Token
Client (React / Flutter)
        ↓ Authorization: Bearer <Firebase ID Token>
NestJS Backend API
        ↓ Verifies token via Firebase Admin SDK
Synchronize / Find Application User (PostgreSQL via Prisma)
        ↓ Check Role & Policies (RolesGuard)
Protected Resource Access (GET /api/v1/users/me)
```

- **Authentication Source**: Firebase Authentication handles identity, passwords, and token issuance.
- **Application Authority**: PostgreSQL stores the application user identity (`firebaseUid`), role (`CUSTOMER`, `MERCHANT`, `SUPPLIER`, `ADMIN`), and profiles.
- **Zero Passwords in Database**: PostgreSQL never stores passwords or custom JWT secrets.

---

## 5. Technology Stack

| Layer | Technologies | Role |
| :--- | :--- | :--- |
| **Authentication** | Firebase Authentication + Firebase Admin SDK | Client authentication and server-side token verification |
| **Web Frontend** | React 18, TypeScript, Vite, Vanilla CSS | Fast, accessible merchant & customer portal |
| **Backend API** | NestJS, TypeScript, Swagger / OpenAPI | Modular REST API, DTO validation, RBAC |
| **Database** | PostgreSQL + Prisma ORM | Persistent source of truth, user & profile models |
| **Async & Cache**| Redis + BullMQ | Background aggregation jobs, rate limiting, and queues |
| **Real-time** | Socket.IO | Real-time demand signal notifications and dashboard feeds |
| **Mobile** | Flutter *(Scheduled for future phase)* | Native mobile client consuming backend APIs |

---

## 6. Repository Structure

```
Mohalla_Signal/
├── backend/                  # NestJS modular API service
│   ├── prisma/               # Prisma database schema (User, Profiles)
│   ├── src/
│   │   ├── common/           # Global guards, filters, interceptors, decorators
│   │   │   ├── decorators/   # @CurrentUser, @Roles
│   │   │   ├── guards/       # FirebaseAuthGuard, RolesGuard
│   │   │   ├── filters/      # AllExceptionsFilter
│   │   │   └── interceptors/ # LoggingInterceptor
│   │   ├── config/           # Validated environment configuration
│   │   ├── firebase/         # Firebase Admin SDK initialization & token verification
│   │   ├── modules/
│   │   │   ├── health/       # Health check endpoint (/api/v1/health)
│   │   │   └── users/        # User profile & onboarding (/api/v1/users/me, /api/v1/users/onboard)
│   │   ├── app.module.ts     # Root application module
│   │   └── main.ts           # Entry point with Helmet, CORS, Swagger UI
│   ├── .env.example          # Environment variable template
│   ├── package.json
│   └── tsconfig.json
├── web/                      # React + TypeScript + Vite frontend
│   ├── src/
│   ├── .env.example
│   ├── package.json
│   └── vite.config.ts
├── mobile/                   # Flutter application (Future phase)
│   └── README.md
├── .gitignore
├── SECURITY.md
└── README.md
```

---

## 7. Environment Configuration

Copy `backend/.env.example` to `backend/.env`:

```env
# Application
NODE_ENV=development
PORT=4000
API_PREFIX=api/v1
CORS_ORIGIN=http://localhost:5173

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-firebase-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"

# PostgreSQL Database (Source of Truth)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mohalla_signal?schema=public

# Redis & Queues
REDIS_HOST=localhost
REDIS_PORT=6379

# Privacy & Throttling Thresholds
DEMAND_MERCHANT_THRESHOLD=3
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

---

## 8. Swagger Manual Testing Guide

1. Start the backend: `npm run start:dev` (in `backend/`).
2. Open Swagger UI at: `http://localhost:4000/api/v1/docs`.
3. In your client / Firebase console, obtain a valid Firebase ID Token for a test user.
4. In Swagger UI, click the **Authorize 🔓** button at the top right.
5. In the **Firebase-JWT (http, Bearer)** popup, paste your token in the **Value** field.
6. Click **Authorize** then **Close**.
7. Expand `GET /api/v1/users/me`, click **Try it out**, then **Execute**.
8. Verify that the response returns HTTP 200 with your synchronized user profile.

---

## 9. Planned Implementation Phases
1. **Phase 1**: Project Initialization, Engineering Standards, Security Foundation & Architecture. *(Completed)*
2. **Phase 2 (Current)**: Firebase Authentication, User Management, RBAC & Core Schema.
3. **Phase 3**: Product Catalog, Normalization & Deterministic Alias Matching Service.
4. **Phase 4**: Merchant Demand Capture (Voice & Text) + Privacy-Preserving Demand Aggregation (BullMQ + Redis).
5. **Phase 5**: Neighborhood Demand Signals & Supplier RFQ / Quote Workflow.
6. **Phase 6**: Merchant Decision (BUY / DON'T BUY), Inventory & Customer Notification Flow.
7. **Phase 7**: Customer Experience, Supporting Loyalty (Server-Calculated), Outcomes & Sales Tracking.
8. **Phase 8**: Mobile Client (Flutter) & Production Hardening / Security Audit.
