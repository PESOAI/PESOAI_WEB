
![MAXIE Banner](https://img.shields.io/badge/MAXIE-PESO%20AI-blue?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-green?style=for-the-badge&logo=node.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue?style=for-the-badge&logo=postgresql)
![React](https://img.shields.io/badge/React-Vite-61DAFB?style=for-the-badge&logo=react)

**MAXIE** is a full-stack financial intelligence admin dashboard built with React.js + Vite (frontend), Node.js + Express.js (backend), and PostgreSQL (database). The system — branded internally as **PESO AI** — provides administrators with real-time analytics, user access control, audit trails, activity logs, and PDF/Excel export capabilities for a personal finance mobile application.


## 🧠 System Overview

MAXIE operates as a secure, role-based admin panel that sits on top of a personal finance platform. Administrators can monitor user financial health, manage accounts, broadcast notifications, and export detailed reports.

```
User (Browser)
    ↓  HTTP Request
React Frontend (Vite @ :5173)
    ↓  REST API Call (Axios / Fetch)
Express Backend (Node.js @ :5000)
    ↓  SQL Query
PostgreSQL Database
    ↓  Query Result
Express Backend
    ↓  JSON Response
React Frontend → UI Update
```

**Key architectural decisions:**

- The **frontend** and **backend** are fully separated for scalability, independent deployability, and maintainability.
- **JWT (JSON Web Tokens)** protect all admin routes. Tokens expire after 9 hours.
- **Role-based access control** distinguishes `Main Admin` (full access) from `Staff Admin` (read-only analytics).
- **Auto-schema initialization** runs on every server start via `initSchema()` in `db.js`, keeping the database in sync without manual migrations.

---

## 📁 Project Structure

```
MAXIE/
│
├── .vscode/                          # VS Code workspace settings
│
├── api/                              # 🔧 Backend — Node.js + Express
│   ├── node_modules/
│   ├── routes/
│   │   ├── auth.js                   # Authentication, admin CRUD, audit logs
│   │   ├── logs.js                   # System activity log endpoints
│   │   └── users.js                  # User management & KPI endpoints
│   │
│   ├── .env                          # 🔑 Environment variables (never commit)
│   ├── .gitignore
│   ├── db.js                         # PostgreSQL pool + auto schema init
│   ├── debug.js                      # Password hash debug utility
│   ├── index.js                      # Server entry point (starts app)
│   ├── package.json
│   ├── package-lock.json
│   ├── seed.js                       # Default admin + category seeder
│   └── server.js                     # Express app config + route mounting
│
└── pesir/                            # 🎨 Frontend — React + Vite
    ├── node_modules/
    ├── public/
    ├── src/
    │   ├── assets/
    │   │   └── logo.png              # PESO AI brand logo
    │   │
    │   ├── components/
    │   │   ├── hub/
    │   │   │   ├── HubModal.jsx       # Slide-in settings modal shell + image cropper
    │   │   │   ├── ProfileDropdown.jsx # Admin profile dropdown menu
    │   │   │   ├── ProfilePanels.jsx  # Profile & Security settings panels
    │   │   │   └── SystemPanels.jsx   # Logs, Audit Trail, Admin Management panels
    │   │   │
    │   │   ├── FeatureCard.jsx        # Landing page feature highlight card
    │   │   ├── Footer.jsx             # Site footer
    │   │   ├── GlobalConfirmModal.jsx # Reusable confirm dialog + toast notifications
    │   │   ├── GlobalNotificationModal.jsx # Admin broadcast notification composer
    │   │   ├── Navbar.jsx             # Top navigation + hidden admin login trigger
    │   │   ├── PdfExportModal.jsx     # Section selector for PDF export
    │   │   └── UIAtoms.jsx            # Shared micro-components (Badge, Card, Dropdown, etc.)
    │   │
    │   ├── layouts/
    │   │   └── AdminLayout.jsx        # Protected layout: sidebar + header + outlet
    │   │
    │   ├── pages/
    │   │   ├── AdminDashboard.jsx     # Main analytics dashboard with charts
    │   │   ├── LandingPage.jsx        # Public-facing landing page
    │   │   └── UserManagement.jsx     # User access control table + export
    │   │
    │   ├── pdf/
    │   │   ├── auditExport.js         # Audit trail → Excel export
    │   │   ├── auditPDF.js            # Audit trail → PDF export
    │   │   ├── dashboardAnalyticsExport.js # Dashboard → Excel export (5 sheets)
    │   │   ├── logoBase64.js          # Embedded base64 logo for exports
    │   │   ├── pdfHelpers.js          # Shared PDF layout engine (jsPDF)
    │   │   ├── usersExport.js         # User list → Excel export
    │   │   └── usersPDF.js            # User list → PDF export
    │   │
    │   ├── utils/
    │   │   └── formulaEngine.js       # Financial formula logic (risk, savings, etc.)
    │   │
    │   ├── App.jsx                    # Router + protected route wrapper
    │   ├── main.jsx                   # React DOM entry point
    │   └── index.css                  # Global styles
    │
    ├── index.html                     # Vite HTML entry (loads Tailwind CDN + ExcelJS)
    ├── package.json
    └── package-lock.json
```

### Folder & File Purposes

| Path | Purpose |
|------|---------|
| `api/routes/auth.js` | Handles login/logout, JWT verification, avatar upload, display name updates, admin CRUD, password change, and audit log endpoints |
| `api/routes/logs.js` | System activity log: POST (write), GET (read), DELETE (clear — Main Admin only) |
| `api/routes/users.js` | User list, single user detail, PATCH user fields, active ping, KPIs, top categories, high-risk users, monthly trend, savings distribution |
| `api/db.js` | PostgreSQL connection pool, auto-schema creation on startup (`initSchema`) |
| `api/seed.js` | Seeds default admin accounts and expense categories if tables are empty |
| `api/index.js` | Application entry: runs `initSchema`, `seedAdmins`, then starts HTTP server |
| `api/server.js` | Express app factory: CORS, JSON parsing, route mounting, 404/error handlers |
| `pesir/src/layouts/AdminLayout.jsx` | Authenticated shell with sidebar navigation, top header, profile dropdown, hub modal system, and toast notifications |
| `pesir/src/pages/AdminDashboard.jsx` | KPI cards, area chart (trend), pie chart (savings distribution), bar chart (categories), risk users panel |
| `pesir/src/pages/UserManagement.jsx` | Searchable/filterable user table with enable/disable actions, PDF and Excel export |
| `pesir/src/pdf/pdfHelpers.js` | Core PDF engine shared by all PDF exporters — cover page, section bars, table renderer, footer stamper |
| `pesir/src/utils/formulaEngine.js` | All financial classification logic: `computeRisk`, `classifySaver`, `classifySpending`, display helpers `peso()` and `pct()` |

---

## 🧰 Technology Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React.js** | 18+ | Component-based UI framework |
| **Vite** | 5+ | Lightning-fast build tool and dev server |
| **React Router DOM** | 6+ | Client-side routing with protected routes |
| **Recharts** | latest | Area, Bar, and Pie chart components |
| **Framer Motion** | latest | Animation on the landing page |
| **Lucide React** | latest | Icon library throughout the app |
| **Tailwind CSS** | CDN | Utility-first CSS (loaded via CDN in `index.html`) |
| **jsPDF** | 2.5.1 | Client-side PDF generation |
| **ExcelJS** | 4.3.0 | Client-side Excel (.xlsx) generation |
| **JSZip** | 3.10.1 | Required by ExcelJS for zip compression |

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 18+ | JavaScript runtime |
| **Express.js** | 4+ | HTTP server and routing framework |
| **bcrypt** | latest | Password hashing and comparison |
| **jsonwebtoken** | latest | JWT generation and verification |
| **cors** | latest | Cross-origin resource sharing |
| **dotenv** | latest | Environment variable loading |
| **pg** | latest | PostgreSQL client (node-postgres) |

### Database

| Technology | Version | Purpose |
|-----------|---------|---------|
| **PostgreSQL** | 14+ | Primary relational database |

---

## ⚙️ Environment Configuration

Create a `.env` file inside the **`api/`** folder:

```bash
# api/.env

PORT=5000

# PostgreSQL connection (individual fields)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=maxie_db

# JWT secret (change this to a strong random string in production)
JWT_SECRET=pesoi_super_secret_key_2026

# Optional: use a full connection string instead of individual fields
# DB_URL=postgresql://postgres:yourpassword@localhost:5432/maxie_db
```

### Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No (default: 5000) | Port the Express server listens on |
| `DB_HOST` | Yes | PostgreSQL server hostname |
| `DB_PORT` | No (default: 5432) | PostgreSQL port |
| `DB_USER` | Yes | PostgreSQL username |
| `DB_PASSWORD` | Yes | PostgreSQL user password |
| `DB_NAME` | Yes | Name of the target database |
| `JWT_SECRET` | No (has fallback) | Secret key used to sign/verify JWTs — **change in production** |
| `DB_URL` | No | Full connection string (overrides individual fields if set) |

> ⚠️ **Never commit your `.env` file.** It is listed in `.gitignore`.

---

## 🗄️ Database Setup

### Step 1 — Install PostgreSQL

Download and install PostgreSQL 14+ from [https://www.postgresql.org/download/](https://www.postgresql.org/download/).

### Step 2 — Create the Database

```sql
CREATE DATABASE maxie_db;
```

Or using the `psql` CLI:

```bash
psql -U postgres -c "CREATE DATABASE maxie_db;"
```

### Step 3 — Run the SQL Schema

The file `webschema.sql` is a **PostgreSQL custom-format dump** (produced by `pg_dump -Fc`). Restore it using `pg_restore`:

```bash
# Recommended: full restore into your target database
pg_restore -U postgres -d maxie_db --no-owner --no-privileges webschema.sql

# Or, if you want to preview the SQL first:
pg_restore --schema-only --no-owner webschema.sql
```

Alternatively, the full DDL is reproduced below so you can run it manually in `psql` or pgAdmin.

> **Required extension** — the schema uses `pgcrypto` for `gen_random_uuid()`. Enable it first:
> ```sql
> CREATE EXTENSION IF NOT EXISTS pgcrypto;
> ```

```sql
-- ══════════════════════════════════════════════════════════════
--  ENUM
-- ══════════════════════════════════════════════════════════════
CREATE TYPE public.admin_role AS ENUM ('Main Admin', 'Staff Admin');

-- ══════════════════════════════════════════════════════════════
--  ADMIN TABLES
-- ══════════════════════════════════════════════════════════════

-- Dashboard administrator accounts
CREATE TABLE public.admins (
  admin_id     SERIAL PRIMARY KEY,
  username     VARCHAR(100) NOT NULL UNIQUE,
  password     VARCHAR(255) NOT NULL,
  role         VARCHAR(20)  NOT NULL DEFAULT 'Staff Admin'
               CONSTRAINT admins_role_check CHECK (role IN ('Main Admin', 'Staff Admin')),
  created_at   TIMESTAMP DEFAULT NOW(),
  avatar       TEXT,
  display_name VARCHAR(100)
);

-- Audit trail: every admin action is logged here
CREATE TABLE public.admin_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id    INTEGER NOT NULL REFERENCES public.admins(admin_id) ON DELETE CASCADE,
  action      VARCHAR(255) NOT NULL,
  target_type VARCHAR(50),
  target_id   UUID,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- System activity log: login successes, failures, and events
CREATE TABLE public.system_logs (
  id        SERIAL PRIMARY KEY,
  type      VARCHAR(20)  NOT NULL,
  timestamp TIMESTAMP    DEFAULT NOW(),
  user_name VARCHAR(100) NOT NULL,
  message   TEXT
);

-- ══════════════════════════════════════════════════════════════
--  USER TABLES (mobile app data)
-- ══════════════════════════════════════════════════════════════

-- Mobile app end-users
CREATE TABLE public.users (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email                VARCHAR(150) NOT NULL UNIQUE,
  password             TEXT NOT NULL,
  created_at           TIMESTAMP DEFAULT NOW(),
  first_name           VARCHAR(100) NOT NULL,
  last_name            VARCHAR(100),
  username             VARCHAR(150) NOT NULL UNIQUE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  last_active_at       TIMESTAMP,
  location             VARCHAR(150),
  profile_picture      TEXT
);

-- Extended financial profile (filled during onboarding)
CREATE TABLE public.user_profiles (
  id               SERIAL PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  age              INTEGER,
  gender           VARCHAR(50),
  occupation       VARCHAR(150),
  monthly_income   NUMERIC(15,2),
  monthly_expenses NUMERIC(15,2),
  financial_goals  JSONB,           -- stored as JSON array of goal strings
  risk_tolerance   VARCHAR(50),
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW(),
  budget_period    VARCHAR(20) DEFAULT 'Monthly',
  phone            VARCHAR(20),
  location         VARCHAR(100)
);

-- Reference table: cities/countries for location picker
CREATE TABLE public.locations (
  location_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  city        VARCHAR(100),
  country     VARCHAR(100)
);

-- ══════════════════════════════════════════════════════════════
--  FINANCIAL DATA TABLES
-- ══════════════════════════════════════════════════════════════

-- Transaction categories (global defaults have user_id = NULL)
CREATE TABLE public.categories (
  category_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES public.users(id) ON DELETE CASCADE,  -- NULL = global
  name        VARCHAR(80) NOT NULL,
  type        VARCHAR(10) NOT NULL CONSTRAINT categories_type_check CHECK (type IN ('income', 'expense')),
  color_hex   VARCHAR(7)  DEFAULT '#6366F1',
  icon        VARCHAR(40)
);

-- All income and expense records from the mobile app
CREATE TABLE public.transactions (
  id               SERIAL PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount           NUMERIC(15,2) NOT NULL,
  transaction_type VARCHAR(10) NOT NULL,   -- 'income' | 'expense'
  description      TEXT,
  transaction_date DATE NOT NULL,
  created_at       TIMESTAMP DEFAULT NOW(),
  category         VARCHAR(100) NOT NULL,
  updated_at       TIMESTAMP DEFAULT NOW()
);

-- Monthly budget limits per user per category
CREATE TABLE public.budgets (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID     NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id  UUID     NOT NULL REFERENCES public.categories(category_id) ON DELETE CASCADE,
  month        SMALLINT NOT NULL CONSTRAINT budgets_month_check CHECK (month BETWEEN 1 AND 12),
  year         SMALLINT NOT NULL,
  limit_amount NUMERIC(15,2) NOT NULL,
  UNIQUE (user_id, category_id, month, year)
);

-- Savings goals set by users
CREATE TABLE public.savings_goals (
  id             SERIAL PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  goal_name      VARCHAR(255) NOT NULL,
  target_amount  NUMERIC(15,2) NOT NULL,
  current_amount NUMERIC(15,2) DEFAULT 0,
  deadline       DATE,
  status         VARCHAR(20) DEFAULT 'Active',
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW(),
  category       VARCHAR(100),
  icon           VARCHAR(100),
  color          VARCHAR(50)
);

-- Manual contributions logged against a savings goal
CREATE TABLE public.goal_contributions (
  id                SERIAL PRIMARY KEY,
  goal_id           INTEGER NOT NULL REFERENCES public.savings_goals(id) ON DELETE CASCADE,
  user_id           UUID    NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount            NUMERIC(15,2) NOT NULL,
  contribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes             TEXT,
  created_at        TIMESTAMP DEFAULT NOW()
);

-- AI chat history per user session
CREATE TABLE public.chat_history (
  id                SERIAL PRIMARY KEY,
  user_id           UUID REFERENCES public.users(id) ON DELETE CASCADE,
  conversation_date TIMESTAMP DEFAULT NOW(),
  messages          JSONB NOT NULL,        -- full message array
  mode              VARCHAR(100),
  exchange_count    INTEGER DEFAULT 0
);
```

### Step 4 — Restore Using pg_restore (Recommended)

Because `webschema.sql` is a **PostgreSQL custom-format dump** (binary, not plain SQL), use `pg_restore` instead of `psql`:

```bash
# Full restore (schema + data if any)
pg_restore -U postgres -d maxie_db --no-owner --no-privileges /path/to/webschema.sql

# Schema only (no data rows)
pg_restore -U postgres -d maxie_db --schema-only --no-owner /path/to/webschema.sql
```

### Step 5 — Run the Seed Script

The seed script runs automatically when the server starts for the first time. It only inserts data if the `admins` table is empty, so it is safe to restart the server repeatedly.

**Default admin accounts created by the seed:**

| Username | Password | Role |
|----------|----------|------|
| `superadmin` | `MainAdmin@2026` | Main Admin |
| `rhenz` | `StaffAdmin@2026` | Staff Admin |
| `jayson` | `StaffAdmin@2026` | Staff Admin |
| `mark` | `StaffAdmin@2026` | Staff Admin |
| `MaxVerstappen` | `StaffAdmin@2026` | Staff Admin |

> 🔐 **Change all passwords immediately after first login in a production environment.**

### Table Reference

| Table | Primary Key | Purpose |
|-------|-------------|---------|
| `admins` | `admin_id` (SERIAL) | Dashboard administrator accounts — role, avatar, display name, bcrypt password |
| `admin_logs` | `id` (UUID) | Immutable audit trail — every admin action with optional IP and target |
| `system_logs` | `id` (SERIAL) | Raw activity log — login success/failure, system events |
| `users` | `id` (UUID) | Mobile app end-users — auth credentials, onboarding status, profile picture |
| `user_profiles` | `id` (SERIAL) | Extended financial profile filled during onboarding — income, expenses, goals (JSONB), risk tolerance |
| `locations` | `location_id` (UUID) | Reference lookup for city/country picker in the mobile app |
| `categories` | `category_id` (UUID) | Transaction categories — global (`user_id = NULL`) or per-user, typed `income`/`expense` |
| `transactions` | `id` (SERIAL) | All income and expense records from the mobile app |
| `budgets` | `id` (UUID) | Monthly budget caps per user per category (unique on `user_id + category_id + month + year`) |
| `savings_goals` | `id` (SERIAL) | Savings targets set by users — with deadline, status, icon, and color |
| `goal_contributions` | `id` (SERIAL) | Individual deposits logged against a savings goal |
| `chat_history` | `id` (SERIAL) | AI advisor conversation history stored as JSONB message arrays |

### Entity Relationship Summary

```
admins ──< admin_logs           (CASCADE DELETE)

users ──< user_profiles         (CASCADE DELETE, 1:1)
users ──< transactions          (CASCADE DELETE)
users ──< categories            (CASCADE DELETE, user-specific only)
users ──< budgets               (CASCADE DELETE)
users ──< savings_goals         (CASCADE DELETE)
users ──< goal_contributions    (CASCADE DELETE)
users ──< chat_history          (CASCADE DELETE)

categories ──< budgets          (CASCADE DELETE)
savings_goals ──< goal_contributions (CASCADE DELETE)
```

---

## 🛠️ Installation Guide

### Prerequisites

- **Node.js** v18 or higher — [https://nodejs.org](https://nodejs.org)
- **npm** v9 or higher (bundled with Node.js)
- **PostgreSQL** v14 or higher — [https://www.postgresql.org](https://www.postgresql.org)
- **Git** — [https://git-scm.com](https://git-scm.com)

### Step 1 — Clone the Repository

```bash
git clone <repository-link>
cd MAXIE
```

### Step 2 — Configure Environment Variables

```bash
cd api
cp .env.example .env   # or create .env manually
# Edit .env with your database credentials
```

### Step 3 — Install Backend Dependencies

```bash
cd api
npm install
```

### Step 4 — Install Frontend Dependencies

```bash
cd pesir
npm install
```

---

## ▶️ Running the System

You need **two terminals** running simultaneously — one for the backend API and one for the React frontend.

### Terminal 1 — Start the Backend API

```bash
cd api
npm start
```

Expected output:

```
✅ DB connected successfully
✅ Schema checks passed
✅ Admins already exist, skipping seed
🚀  PESO AI API running → http://localhost:5000
    Routes: /api/auth | /api/logs | /api/users | /api/admin/*
```

### Terminal 2 — Start the React Frontend

```bash
cd pesir
npm run dev
```

Expected output:

```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Default Access URLs

| Service | URL |
|---------|-----|
| **React Frontend** | [http://localhost:5173](http://localhost:5173) |
| **Express Backend API** | [http://localhost:5000](http://localhost:5000) |
| **API Health Check** | [http://localhost:5000/api/health](http://localhost:5000/api/health) |

### Accessing the Admin Dashboard

The admin login is hidden from the public landing page. To access it:

1. Open [http://localhost:5173](http://localhost:5173)
2. **Tap the logo 5 times rapidly** — the admin authentication modal will appear
3. Enter credentials (e.g., `superadmin` / `MainAdmin@2026`)
4. You will be redirected to `/admin`

---

## 🔌 API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Auth Required | Role | Description |
|--------|----------|:---:|------|-------------|
| `POST` | `/api/auth/login` | ❌ | — | Admin login, returns JWT token |
| `POST` | `/api/auth/logout` | ✅ | Any | Logout and write system log |
| `GET` | `/api/auth/verify` | ✅ | Any | Verify JWT token validity |
| `GET` | `/api/auth/admins/me` | ✅ | Any | Get current admin profile |
| `PUT` | `/api/auth/admins/avatar` | ✅ | Any | Upload/update profile avatar (base64, max 2MB) |
| `PUT` | `/api/auth/admins/display-name` | ✅ | Any | Update display name |
| `PUT` | `/api/auth/admins/change-password` | ✅ | Any | Change own password (bcrypt hashed) |
| `GET` | `/api/auth/admins` | ✅ | Any | List all admin accounts |
| `POST` | `/api/auth/admins` | ✅ | Main Admin | Create a new Staff Admin account |
| `DELETE` | `/api/auth/admins/:id` | ✅ | Main Admin | Delete a Staff Admin account |
| `GET` | `/api/auth/audit-logs` | ✅ | Any | Retrieve last 200 audit trail entries |
| `POST` | `/api/auth/audit-logs` | ✅ | Any | Write a custom audit log entry |

### System Logs (`/api/logs`)

| Method | Endpoint | Auth Required | Role | Description |
|--------|----------|:---:|------|-------------|
| `GET` | `/api/logs` | ✅ | Any | Retrieve last 100 system log entries |
| `POST` | `/api/logs` | ✅ | Any | Write a new system log entry |
| `DELETE` | `/api/logs` | ✅ | Main Admin | Clear all system logs |

### Users & Analytics (`/api/users`, `/api/admin`)

| Method | Endpoint | Auth Required | Role | Description |
|--------|----------|:---:|------|-------------|
| `GET` | `/api/users` | ✅ | Any | Full user list with profile data |
| `GET` | `/api/users/:id` | ✅ | Any | Single user detail with financial profile |
| `PATCH` | `/api/users/:id` | ✅ | Any | Update user fields (onboarding status, location) |
| `POST` | `/api/users/:id/active` | ✅ | Any | Ping user's last active timestamp |
| `GET` | `/api/admin/kpis` | ✅ | Any | KPI summary (users, income, expenses, savings) |
| `GET` | `/api/admin/top-categories` | ✅ | Any | Top 6 expense categories for current month |
| `GET` | `/api/admin/high-risk` | ✅ | Any | Users classified by expense ratio risk level |
| `GET` | `/api/admin/monthly-trend` | ✅ | Any | Financial trend data (daily / weekly / monthly) |
| `GET` | `/api/admin/savings-distribution` | ✅ | Any | Savings saver classification breakdown |

---

## 🔄 System Workflow

### Authentication Flow

```
1. Admin visits landing page (public)
2. Admin taps logo 5x → login modal appears
3. Credentials submitted → POST /api/auth/login
4. Backend verifies bcrypt password → issues JWT (9h expiry)
5. Token + user data stored in localStorage
6. React Router redirects to /admin (protected route)
7. ProtectedRoute component verifies token on every navigation
8. Token expiry automatically clears session and redirects to /
```

### Data Flow (Dashboard)

```
1. AdminDashboard mounts → parallel fetch to 4 API endpoints
2. KPIs, categories, high-risk users, savings distribution loaded
3. Charts rendered via Recharts (AreaChart, BarChart, PieChart)
4. Admin selects trend period (Daily / Weekly / Monthly)
5. Trend data re-fetched → chart updates in real time
6. Admin clicks Export PDF → PdfExportModal opens
7. Section selection → generatePDF() renders via jsPDF
8. Admin clicks Export Excel → generateDashboardXLSX() runs via ExcelJS
```

### Role-Based Access

```
Main Admin
 ├── Full analytics dashboard access
 ├── User Management page (/admin/users)
 ├── Activity Logs viewer
 ├── Audit Trail viewer (with Excel/PDF export)
 ├── Admin Management (create/delete staff admins)
 ├── Send Notification broadcast
 └── Maintenance Mode toggle

Staff Admin
 ├── Full analytics dashboard access
 └── Profile settings (avatar, display name, password)
 ✗  No access to /admin/users
 ✗  No access to Admin Management
```

---

## ✨ System Features

### 📊 Analytics Dashboard
Real-time financial monitoring with 5 KPI cards (Total Users, Active Users %, Average Income, Average Expenses, Average Savings), plus interactive charts for financial trends, savings distribution, top spending categories, and risk user classification.

### 👥 User Management *(Main Admin only)*
Full CRUD-capable user access control table with search, status filtering (Active / Inactive), one-click enable/disable with confirmation modal, and export to PDF or Excel.

### 📋 System Logs
Real-time activity log capturing all login successes, failures, and system events. Supports refresh and full clear (Main Admin only).

### 🔍 Audit Trail
Immutable log of every admin action — login, logout, profile changes, password resets, admin account creation/deletion — with filter pills (All, Today, Login, Logout, Created, Deleted, Updated) and Excel/PDF export.

### 📤 PDF Export
Section-selectable, A4-formatted PDF reports using jsPDF. The dashboard report includes a branded cover page, KPI tables, trend data, savings distribution, category spending, and risk users. Audit and user reports are also individually exportable.

### 📊 Excel Export
Multi-sheet Excel workbooks generated client-side using ExcelJS. The dashboard export includes 5 sheets (Overview, Financial Trend, Category Spending, Savings Distribution, Risk Users) each with formula legend sections, colour-coded cells, and embedded logo.

### 🔔 Notification Broadcasting *(Main Admin only)*
Compose and send (or schedule) push notifications to all mobile app users. Supports 4 notification types: Announcement, Reminder, New Feature, and Tip & Advice.

### 🔐 Security Settings
Admins can change their password (minimum 8 characters, enforced strength requirements), update their display name, and upload/crop a profile avatar. All changes persist to the database.

### 🏠 Landing Page
Animated public-facing page with hero section, features showcase (Smart Tracking, Real-time Insights, Goal Setting, Secure Data), and navigation. The admin login is accessible only through a hidden 5-tap gesture on the logo.

---

## 🧪 Troubleshooting

### ❌ Database Connection Error

**Symptom:** `❌ DB connection FAILED: connect ECONNREFUSED`

**Solutions:**
- Confirm PostgreSQL is running: `pg_ctl status` or check your system services
- Verify your `.env` values match your PostgreSQL installation (host, port, user, password, database name)
- Ensure the database `maxie_db` (or your configured `DB_NAME`) exists: `psql -U postgres -l`
- Check that your PostgreSQL user has privileges on the database

---

### ❌ npm install Errors

**Symptom:** Dependency resolution failures or peer dependency warnings

**Solutions:**
```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# If using Node.js v17+ and seeing OpenSSL errors on the frontend:
export NODE_OPTIONS=--openssl-legacy-provider
npm run dev
```

---

### ❌ Port Already in Use

**Symptom:** `Error: listen EADDRINUSE: address already in use :::5000`

**Solutions:**
```bash
# Find and kill the process using port 5000 (macOS/Linux)
lsof -ti:5000 | xargs kill -9

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Or change the port in api/.env:
PORT=5001
# Then update the API base URL in the frontend files from :5000 to :5001
```

---

### ❌ CORS Errors

**Symptom:** `Access to fetch at 'http://localhost:5000' has been blocked by CORS policy`

**Solutions:**
- Ensure the backend server (`api/`) is running
- Verify the frontend is running on `localhost:5173` or `localhost:3000` — these are the only origins whitelisted in `server.js`
- If running on a different port, add it to the `origin` array in `api/server.js`:
  ```javascript
  origin: ['http://localhost:5173', 'http://localhost:YOUR_PORT'],
  ```

---

### ❌ Login Returns 401 "Invalid Credentials"

**Symptom:** Correct credentials rejected at login

**Solutions:**
- Run the seed script by restarting the server (`npm start`) — it auto-seeds if the admins table is empty
- Use the debug utility to verify password hash: `node debug.js`
- If the admins table was manually edited, ensure passwords are bcrypt-hashed (not plain text)
- Default credentials: `superadmin` / `MainAdmin@2026`

---

### ❌ Charts Show No Data

**Symptom:** Dashboard renders but all charts are empty or show "No data"

**Solutions:**
- Verify the `transactions` and `users` tables have data (they are populated by the mobile app)
- Check browser console for API 500 errors — the backend logs the exact SQL error
- Confirm the `transactions` table exists and has the correct columns (`transaction_type`, `transaction_date`, `amount`, `category`, `user_id`)

---

### ❌ PDF/Excel Export Not Working

**Symptom:** Export button clicks do nothing or shows a JS error

**Solutions:**
- Confirm your browser allows CDN script loading (some ad blockers block `cdnjs.cloudflare.com`)
- Check the browser console for ExcelJS or jsPDF loading errors
- These libraries are loaded dynamically on first use — ensure internet access is available when using export features
- `index.html` preloads `JSZip` and `ExcelJS` via `<script>` tags — verify they are not blocked

---

## 👨‍💻 Developer Notes

### Critical Rules

> 🔴 **Never modify `JWT_SECRET` in production without invalidating all active sessions.** All logged-in admins will be force-logged out when the secret changes.

> 🔴 **Never hardcode database credentials in source files.** All environment configuration belongs exclusively in `api/.env`.

> 🟡 **Always run `seedAdmins()` (via server start) after initializing a fresh database.** The seed only inserts data if the admins table is empty and is safe to run repeatedly.

> 🟡 **The `initSchema()` function in `db.js` uses `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` — it is safe to run on every server start** and will not destroy existing data.

### Adding a New API Route

1. Create your route handler in `api/routes/yourRoute.js`
2. Export the router as `export default router`
3. Import and mount it in `api/server.js`:
   ```javascript
   import yourRoute from './routes/yourRoute.js';
   app.use('/api', yourRoute);
   ```

### Changing the Frontend API Base URL

All frontend files reference the backend as `http://localhost:5000`. If you change the backend port, update the `BASE` or `API` constants in these files:

- `pesir/src/layouts/AdminLayout.jsx` — `const BASE = 'http://localhost:5000'`
- `pesir/src/components/hub/ProfilePanels.jsx` — `const BASE = 'http://localhost:5000'`
- `pesir/src/components/hub/SystemPanels.jsx` — `const BASE = 'http://localhost:5000'`
- `pesir/src/components/GlobalNotificationModal.jsx` — `const API = 'http://localhost:5000/api/admin'`
- `pesir/src/pages/AdminDashboard.jsx` — `const API = 'http://localhost:5000/api/admin'`
- `pesir/src/pages/UserManagement.jsx` — hardcoded `http://localhost:5000/api/users`
- `pesir/src/components/Navbar.jsx` — hardcoded `http://localhost:5000/api/auth/login`

> 💡 Consider extracting this into a `pesir/src/config.js` file for easier management.

### Financial Formula Reference

All financial classification logic lives in `pesir/src/utils/formulaEngine.js`:

| Formula | Threshold | Classification |
|---------|-----------|---------------|
| `Expense Ratio = (Expenses ÷ Income) × 100` | ≥ 80% | High Risk |
| | 50–79% | Medium Risk |
| | < 50% | Low Risk |
| `Savings Rate = ((Income − Expenses) ÷ Income) × 100` | < 0% | Negative Saver |
| | 0–9% | Low Saver |
| | 10–29% | Mid Saver |
| | ≥ 30% | High Saver |
| `Category Share = (Category Spend ÷ Total Top-6 Spend) × 100` | ≥ 40% | Over Limit |
| | 25–39% | Caution |
| | < 25% | Normal |

### Password Requirements (Enforced UI-side)

New admin passwords must satisfy all four criteria:

- At least 8 characters
- Contains an uppercase letter
- Contains a number
- Contains a special character

---

## 📄 License

```
MIT License

Copyright (c) 2026 MAXIE / PESO AI Project

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```


*PESO AI — Financial Intelligence for Every Filipino*

