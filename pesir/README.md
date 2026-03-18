![MAXIE Banner](https://img.shields.io/badge/MAXIE-PESO%20AI-blue?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-green?style=for-the-badge&logo=node.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue?style=for-the-badge&logo=postgresql)
![React](https://img.shields.io/badge/React-Vite-61DAFB?style=for-the-badge&logo=react)

**MAXIE** is a full-stack financial intelligence admin dashboard built with React.js + Vite (frontend), Node.js + Express.js (backend), and PostgreSQL (database). The system — branded internally as **PESO AI** — provides administrators with real-time analytics, user access control, audit trails, activity logs, and PDF/Excel export capabilities for a personal finance mobile application.

---

## 🚀 Quick Setup

> **New to this project? Start here.** Follow these steps in order and you'll have the system running in minutes.

### Prerequisites

Make sure these are installed before you begin:

- **Node.js** v18+ — [https://nodejs.org](https://nodejs.org)
- **npm** v9+ (bundled with Node.js)
- **PostgreSQL** v14+ — [https://www.postgresql.org](https://www.postgresql.org)
- **Git** — [https://git-scm.com](https://git-scm.com)

---

### Step 1 — Clone the Repository

```bash
git clone <repository-link>
cd MAXIE (depende sa folder mo )
```

---

### Step 2 — Set Up Environment Variables

```bash
cd api
```

Create a `.env` file inside the `api/` folder:

```bash
# api/.env

PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=webschema

JWT_SECRET=pesoi_super_secret_key_2026

# Optional: use a full connection string instead
# DB_URL=postgresql://postgres:yourpassword@localhost:5432/webschema
```

> ⚠️ Never commit your `.env` file — it is already listed in `.gitignore`.

---

### Step 3 — Set Up the Database

**3a. Create the database:**

```bash
psql -U postgres -c "CREATE DATABASE example_db;"
```

**3b. Restore the schema from `webschema.sql`:**

```bash
pg_restore -U postgres -d maxie_db --no-owner --no-privileges webschema.sql
```

> All tables are created automatically from `webschema.sql`. No manual SQL needed. The file is included in the repository.

---

### Step 4 — Install Dependencies

**Backend:**

```bash
cd api
npm install
```

**Frontend:**

```bash
cd pesir
npm install
```

---

### Step 5 — Run the System

Open **two terminals** side by side:

**Terminal 1 — Backend API:**

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

**Terminal 2 — Frontend:**

```bash
cd pesir
npm run dev
```

Expected output:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

---

### Step 6 — Access the Dashboard

| Service | URL |
|---------|-----|
| **React Frontend** | [http://localhost:5173](http://localhost:5173) |
| **Express Backend API** | [http://localhost:5000](http://localhost:5000) |
| **API Health Check** | [http://localhost:5000/api/health](http://localhost:5000/api/health) |

The admin login is **hidden** from the public page. To access it:

1. Open [http://localhost:5173](http://localhost:5173)
2. **Tap the logo 5 times rapidly** — the login modal appears
3. Use the default credentials below

**Default Admin Accounts** (seeded automatically on first run):

| Username | Password | Role |
|----------|----------|------|
| `superadmin` | `MainAdmin@2026` | Main Admin |
| `rhenz` | `StaffAdmin@2026` | Staff Admin |
| `jayson` | `StaffAdmin@2026` | Staff Admin |
| `mark` | `StaffAdmin@2026` | Staff Admin |
| `MaxVerstappen` | `StaffAdmin@2026` | Staff Admin |

> 🔐 Change all passwords immediately after first login in a production environment.

---

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
- **Auto-schema initialization** runs on every server start via `initSchema()` in `config/db.js`, keeping the database in sync without manual migrations.
- **MVC architecture** separates concerns across `controllers/`, `middleware/`, `validators/`, `routes/`, `config/`, and `constants/` for maintainability and scalability.

---

## 📁 Project Structure

```
MAXIE/
│
├── .vscode/                          # VS Code workspace settings
│
├── api/                              # 🔧 Backend — Node.js + Express
│   ├── node_modules/
│   │
│   ├── config/
│   │   ├── db.js                     # PostgreSQL pool + auto schema init
│   │   └── index.js                  # Centralized env vars (PORT, JWT, DB, CORS)
│   │
│   ├── constants/
│   │   └── index.js                  # ROLES, HTTP status codes, fixed values
│   │
│   ├── controllers/
│   │   ├── authController.js         # Login, logout, admin CRUD, audit log logic
│   │   ├── logController.js          # System log business logic
│   │   └── userController.js         # User management & dashboard analytics logic
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js         # JWT verifyToken middleware
│   │   └── errorHandler.js           # 404 + global error handler
│   │
│   ├── routes/
│   │   ├── auth.js                   # /api/auth/* route definitions only
│   │   ├── logs.js                   # /api/logs route definitions only
│   │   └── users.js                  # /api/users + /api/admin/* route definitions only
│   │
│   ├── validators/
│   │   └── authValidator.js          # Input validation middleware
│   │
│   ├── .env                          # 🔑 Environment variables (never commit)
│   ├── .gitignore
│   ├── debug.js                      # Password hash debug utility (dev only)
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
| `api/config/db.js` | PostgreSQL connection pool, auto-schema creation on startup (`initSchema`) |
| `api/config/index.js` | Exports all environment variables — `PORT`, `JWT_SECRET`, `DB_CONFIG`, `CORS_ORIGINS` |
| `api/constants/index.js` | All hardcoded values — `ROLES`, `HTTP` status codes, `BCRYPT_ROUNDS`, `LOG_LIMIT`, chart colors |
| `api/controllers/authController.js` | Handles login/logout, JWT verification, avatar upload, display name, admin CRUD, password change, and audit log logic |
| `api/controllers/logController.js` | System activity log: create, read, and clear logic |
| `api/controllers/userController.js` | User list, single user detail, PATCH user fields, active ping, KPIs, top categories, high-risk users, monthly trend, savings distribution |
| `api/middleware/authMiddleware.js` | `verifyToken` — JWT verification middleware used across protected routes |
| `api/middleware/errorHandler.js` | Global 404 handler (`notFound`) and 500 error handler (`errorHandler`) |
| `api/routes/auth.js` | Route definitions only for `/api/auth/*` — wires middleware + controllers |
| `api/routes/logs.js` | Route definitions only for `/api/logs` |
| `api/routes/users.js` | Route definitions only for `/api/users` and `/api/admin/*` |
| `api/validators/authValidator.js` | Input validation middleware — login, avatar, display name, password, admin creation, audit log |
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

## 🗄️ Database Reference

### Restoring the Schema

The `webschema.sql` file included in the repository is a full PostgreSQL backup. Restore it using `pg_restore`:

```bash
# Full restore — schema + data
pg_restore -U postgres -d maxie_db --no-owner --no-privileges webschema.sql

# Schema only — no data rows
pg_restore -U postgres -d maxie_db --schema-only --no-owner webschema.sql
```

> ⚠️ `webschema.sql` is a **binary dump** (pg_dump -Fc format) — do not open it with `psql`. Always use `pg_restore`.

### Table Reference

| Table | Primary Key | Purpose |
|-------|-------------|---------|
| `admins` | `admin_id` (SERIAL) | Dashboard administrator accounts |
| `admin_logs` | `id` (UUID) | Immutable audit trail |
| `system_logs` | `id` (SERIAL) | Raw activity log |
| `users` | `id` (UUID) | Mobile app end-users |
| `user_profiles` | `id` (SERIAL) | Extended financial profile |
| `locations` | `location_id` (UUID) | City/country reference lookup |
| `categories` | `category_id` (UUID) | Transaction categories |
| `transactions` | `id` (SERIAL) | All income and expense records |
| `budgets` | `id` (UUID) | Monthly budget caps per user per category |
| `savings_goals` | `id` (SERIAL) | Savings targets set by users |
| `goal_contributions` | `id` (SERIAL) | Individual deposits against a savings goal |
| `chat_history` | `id` (SERIAL) | AI advisor conversation history (JSONB) |

### Entity Relationship Summary

```
admins ──< admin_logs                    (CASCADE DELETE)

users ──< user_profiles                  (CASCADE DELETE, 1:1)
users ──< transactions                   (CASCADE DELETE)
users ──< categories                     (CASCADE DELETE, user-specific only)
users ──< budgets                        (CASCADE DELETE)
users ──< savings_goals                  (CASCADE DELETE)
users ──< goal_contributions             (CASCADE DELETE)
users ──< chat_history                   (CASCADE DELETE)

categories ──< budgets                   (CASCADE DELETE)
savings_goals ──< goal_contributions     (CASCADE DELETE)
```

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
4. Backend: validateLogin middleware checks input
5. authController verifies bcrypt password → issues JWT (9h expiry)
6. Token + user data stored in localStorage
7. React Router redirects to /admin (protected route)
8. ProtectedRoute component verifies token on every navigation
9. Token expiry automatically clears session and redirects to /
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

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📊 **Analytics Dashboard** | 5 KPI cards + area, bar, and pie charts for financial trends, savings distribution, top categories, and risk classification |
| 👥 **User Management** | Searchable/filterable user table with enable/disable and PDF/Excel export *(Main Admin only)* |
| 📋 **System Logs** | Real-time activity log for logins, failures, and system events |
| 🔍 **Audit Trail** | Immutable admin action log with filter pills and Excel/PDF export |
| 📤 **PDF Export** | Section-selectable A4 reports with branded cover page via jsPDF |
| 📊 **Excel Export** | Multi-sheet workbooks with color-coded cells and embedded logo via ExcelJS |
| 🔔 **Notifications** | Broadcast push notifications to all mobile app users *(Main Admin only)* |
| 🔐 **Security Settings** | Password change, display name update, avatar upload/crop |
| 🏠 **Landing Page** | Animated public page with hidden 5-tap admin login gesture |

---

## 🧪 Troubleshooting

### ❌ DB connection FAILED: connect ECONNREFUSED
- Confirm PostgreSQL is running: `pg_ctl status`
- Verify `.env` credentials match your PostgreSQL setup
- Ensure `maxie_db` exists: `psql -U postgres -l`

### ❌ npm install errors
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### ❌ Port already in use (:::5000)
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:5000 | xargs kill -9
```

### ❌ CORS errors
- Ensure the backend is running
- Frontend must be on `localhost:5173` or `localhost:3000`
- To add a different port, update `CORS_ORIGINS` in `api/config/index.js`

### ❌ Login returns 401
- Restart the server — it auto-seeds admins on first run
- Verify hash with: `node debug.js`
- Default: `superadmin` / `MainAdmin@2026`

### ❌ Charts show no data
- The `transactions` and `users` tables need data from the mobile app
- Check browser console for API 500 errors

### ❌ PDF/Excel export not working
- Some ad blockers block `cdnjs.cloudflare.com` — disable or whitelist it
- Check browser console for ExcelJS or jsPDF loading errors

---

## 👨‍💻 Developer Notes

### Critical Rules

> 🔴 **Never modify `JWT_SECRET` in production** without invalidating all active sessions.

> 🔴 **Never hardcode credentials in source files.** All config belongs in `api/.env`, exported through `api/config/index.js`.

> 🟡 **`initSchema()` in `config/db.js` is safe to run on every start** — uses `IF NOT EXISTS` and will never destroy existing data.

### Adding a New API Route

1. Add business logic to `api/controllers/yourController.js`
2. Add input validation to `api/validators/yourValidator.js`
3. Create `api/routes/yourRoute.js` — route definitions only
4. Mount in `api/server.js`:
   ```javascript
   import yourRoute from './routes/yourRoute.js';
   app.use('/api', yourRoute);
   ```
5. Add any constants to `api/constants/index.js`

### Changing the Frontend API Base URL

If you change the backend port from `5000`, update these files:

| File | Variable |
|------|----------|
| `pesir/src/layouts/AdminLayout.jsx` | `const BASE` |
| `pesir/src/components/hub/ProfilePanels.jsx` | `const BASE` |
| `pesir/src/components/hub/SystemPanels.jsx` | `const BASE` |
| `pesir/src/components/GlobalNotificationModal.jsx` | `const API` |
| `pesir/src/pages/AdminDashboard.jsx` | `const API` |
| `pesir/src/pages/UserManagement.jsx` | hardcoded URL |
| `pesir/src/components/Navbar.jsx` | hardcoded URL |

> 💡 Consider centralizing these into `pesir/src/config.js` for easier management.

### Financial Formula Reference

| Formula | Threshold | Classification |
|---------|-----------|---------------|
| `Expense Ratio = Expenses ÷ Income × 100` | ≥ 80% | High Risk |
| | 50–79% | Medium Risk |
| | < 50% | Low Risk |
| `Savings Rate = (Income − Expenses) ÷ Income × 100` | < 0% | Negative Saver |
| | 0–9% | Low Saver |
| | 10–29% | Mid Saver |
| | ≥ 30% | High Saver |

---

## 📄 License

```
MIT License — Copyright (c) 2026 MAXIE / PESO AI Project
```

*PESO AI — Financial Intelligence for Every Filipino*