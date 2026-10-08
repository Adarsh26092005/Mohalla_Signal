# Security Policy & Development Checklist: Mohalla Signal

Security is a first-class requirement across all phases of Mohalla Signal. This document outlines active security standards, developer checklists, and audit procedures.

---

## 1. Secrets & Authentication Architecture
- [x] **Firebase Authentication**: User authentication is delegated entirely to Firebase Authentication. The backend never stores passwords or authentication secrets.
- [x] **Firebase Admin Token Verification**: Backend verifies Firebase ID tokens cryptographically using the official Firebase Admin SDK.
- [x] **No Stored Password Hashes**: PostgreSQL only stores the unique `firebaseUid` and application identity—no password fields exist in the database.
- [x] **Secure Credential Loading**: Firebase service credentials (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) are read strictly via environment variables.
- [x] **Git Protection**: `.gitignore` strictly blocks `.env` and `.env.*` files. Service account JSON files are never stored or committed.

---

## 2. Server-Side Authorization & RBAC
- [x] **Role Hierarchy**: Strict role definitions (`CUSTOMER`, `MERCHANT`, `SUPPLIER`, `ADMIN`).
- [x] **Server-Side Verification**: Roles are stored in PostgreSQL and checked on each request via `RolesGuard`. Client-supplied roles or headers are never trusted.
- [x] **Privilege Escalation Protection**: Public onboarding (`/api/v1/users/onboard`) explicitly forbids the `ADMIN` role. Administrator privileges can never be self-assigned.
- [x] **Resource Isolation (BOLA/IDOR)**: Merchants and suppliers only access their own profile and transactional resources.

---

## 3. Input Validation & Data Integrity
- [x] **DTO Whitelisting**: `ValidationPipe` configured with `whitelist: true`, `forbidNonWhitelisted: true`, and `transform: true`.
- [x] **Mass Assignment Defense**: Unwhitelisted fields in request bodies are stripped and rejected with HTTP 400.
- [x] **PIN Code & Format Validation**: Indian postal PIN codes validated with regex (`/^[1-9][0-9]{5}$/`).
- [x] **Entity Integrity**: Cascading profile deletions and unique constraints enforced at the database layer via Prisma.

---

## 4. Network & API Hardening
- [x] **Security Headers (Helmet)**: X-Frame-Options, X-Content-Type-Options, DNS Prefetch Control.
- [x] **Explicit CORS**: Restrict origins to explicitly configured frontend domains.
- [x] **Rate Limiting (Throttler)**: Tiered rate limiting protects against automated brute-force attacks and abuse.
- [x] **Safe Error Masking**: `AllExceptionsFilter` masks internal database errors and Firebase exception traces from production responses.

---

## 5. Demand Privacy Policy (Upcoming Core Feature)
- [ ] **Privacy-Thresholded Aggregation**: Raw single-merchant requests are never published. Demand signals become visible only when $\ge 3$ distinct merchants record demand.
- [ ] **Merchant Anonymity**: Neighborhood signals aggregate counts without disclosing shop identities.

---

## 6. Development Security Checklist
- [x] No plaintext passwords or hashing libraries (Firebase Auth handles credentials)
- [x] No `JWT_SECRET` in environment or code
- [x] No fake authentication testing executed by AI agents
- [x] Safe Swagger OpenAPI documentation for manual Bearer token testing
