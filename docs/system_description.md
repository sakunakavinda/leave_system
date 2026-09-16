# Leave System — Full System Description & Functionality Analysis

> **Purpose:** Feed this document into Gemini (or any AI) and ask it to suggest the changes needed to bring this system to the architecture standard of a professional, enterprise-grade Leave Application System.

---

## 1. Project Overview

**"Staff Leave Desk"** is a web-based employee leave management system built for a multi-branch, multi-department organisation. It allows employees to self-serve their leave applications and allows managers to review, approve, and reject those applications through an admin panel.

- **Dev server port:** Vite → `:5173`, Express API → `:5005`
- **Production:** Vite builds to `dist/`, Express serves it as a static SPA
- **Deployment target:** Plesk shared hosting (mentioned in server code)
- **Branding credit:** "dubLive technologies"

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 19 (Vite 8) |
| Routing | React Router DOM v7 |
| Styling | Vanilla CSS (no Tailwind, no UI lib) |
| Backend runtime | Node.js with Express 5 |
| Database | MySQL (via `mysql2/promise` connection pool) |
| Authentication | Username + SHA-256 hashed password (managers); secret code (employees) |
| Build tool | Vite |
| Dev runner | `concurrently` (runs Vite + nodemon in parallel) |
| Environment config | `dotenv` |

**No TypeScript, no ORM, no unit tests, no linting CI, no JWT/sessions.**

---

## 3. Repository Structure

```
leave_system/
├── .env                        # DB credentials & PORT
├── index.html                  # Vite SPA shell
├── package.json
├── vite.config.js
├── db/
│   ├── schema.sql              # Canonical table definitions
│   ├── seed.sql                # Sample seed data
│   ├── data_clean.sql          # Production data dump
│   └── new_dump.sql            # Partial data dump (PostgreSQL format – mismatched!)
├── server/
│   ├── index.js                # Express app entry point
│   ├── db.js                   # MySQL connection pool
│   └── routes/
│       ├── applications.js     # Core leave application logic
│       ├── branches.js
│       ├── departments.js
│       ├── employees.js
│       ├── leaveTypes.js
│       ├── managers.js
│       ├── roles.js
│       ├── rules.js
│       └── settings.js
└── src/
    ├── main.jsx                # React entry — sets up BrowserRouter + two routes
    ├── App.jsx                 # Employee-facing portal (leave application form + views)
    ├── LeaveList.jsx           # Employee's own application history list
    ├── LeaveOverview.jsx       # Employee's personal leave balance + heatmap
    ├── SubstitutionsList.jsx   # Substitute agreement panel for employees
    ├── api.js                  # Shared fetch-based API client
    └── admin/
        ├── AdminApp.jsx        # Admin shell (login, sidebar nav, page routing)
        ├── AdminPages.jsx      # All admin page components (3698 lines, one file)
        ├── admin.css           # Admin-specific styles (41 KB)
        └── theme.js            # Theme color definitions + CSS variable injector
```

---

## 4. Database Schema (MySQL)

### 4.1 Tables

#### `branches`
| Column | Type | Notes |
|---|---|---|
| id | VARCHAR(36) PK | UUID |
| name | VARCHAR(100) UNIQUE | |
| location | VARCHAR(255) | |
| status | VARCHAR(20) | `active` / `inactive` |
| created_at / updated_at | TIMESTAMP | |

#### `departments`
| Column | Type | Notes |
|---|---|---|
| id | VARCHAR(36) PK | UUID |
| name | VARCHAR(100) UNIQUE | |
| description | TEXT | |
| status | VARCHAR(20) | |

#### `roles`
| Column | Type | Notes |
|---|---|---|
| id | VARCHAR(36) PK | UUID |
| title | VARCHAR(100) | |
| department_id | VARCHAR(36) FK → departments | CASCADE delete |
| description | TEXT | |
| status | VARCHAR(20) | |
| UNIQUE | (title, department_id) | |

#### `employees`
| Column | Type | Notes |
|---|---|---|
| id | VARCHAR(36) PK | UUID |
| name | VARCHAR(255) | |
| secret_code | VARCHAR(255) UNIQUE | Plain-text PIN used as authentication |
| role_id | FK → roles | RESTRICT delete |
| branch_id | FK → branches | RESTRICT delete |
| status | VARCHAR(20) | |

**Note: Secret code is stored and transmitted in plain text.**

#### `managers`
| Column | Type | Notes |
|---|---|---|
| id | VARCHAR(36) PK | UUID |
| username | VARCHAR(100) UNIQUE | |
| password_hash | VARCHAR(255) | SHA-256 hash (not bcrypt) |
| role | VARCHAR(50) | `manager` or `super manager` |
| branch_id | FK → branches | SET NULL on delete |
| status | VARCHAR(20) | |

#### `leave_rules`
| Column | Type | Notes |
|---|---|---|
| id | VARCHAR(36) PK | UUID |
| role_id | FK → roles | CASCADE delete |
| branch_id | FK → branches | CASCADE delete |
| annual_leave | INT DEFAULT 14 | Max annual leave days per year |
| sick_leave | INT DEFAULT 10 | Max sick leave days per year |
| casual_leave | INT DEFAULT 7 | Max casual leave days per year |
| max_per_day | INT DEFAULT 1 | Max simultaneous people on leave per role/branch |
| status | VARCHAR(20) | |
| UNIQUE | (role_id, branch_id) | One rule per role-branch pair |

**Note:** When a custom leave type is added, an `ALTER TABLE leave_rules ADD COLUMN {code}_leave` is executed dynamically to extend this table. This is a serious anti-pattern.

#### `leave_applications`
| Column | Type | Notes |
|---|---|---|
| id | VARCHAR(36) PK | UUID |
| employee_id | FK → employees | CASCADE delete |
| substitute_employee_id | FK → employees | SET NULL on delete |
| leave_type | VARCHAR(50) | Code string (e.g., `annual`, `sick`, `casual`, or custom) |
| applied_date | DATE | Date the application was submitted |
| returning_date | DATE | Expected return date (day after last leave date) |
| substitute_confirmed | BOOLEAN DEFAULT false | |
| status | VARCHAR(20) | `pending` / `approved` / `rejected` |

#### `leave_application_dates`
| Column | Type | Notes |
|---|---|---|
| id | VARCHAR(36) PK | UUID |
| leave_application_id | FK → leave_applications | CASCADE delete |
| leave_date | DATE | Individual leave day |
| UNIQUE | (leave_application_id, leave_date) | No duplicate dates per application |

**Design note:** Leave dates are stored as individual rows (not as a date range), allowing for non-contiguous leave days.

#### `leave_balances`
| Column | Type | Notes |
|---|---|---|
| id | VARCHAR(36) PK | UUID |
| employee_id | FK → employees | CASCADE delete |
| year | INT | Calendar year |
| annual_taken | INT DEFAULT 0 | Taken days so far |
| sick_taken | INT DEFAULT 0 | |
| casual_taken | INT DEFAULT 0 | |
| UNIQUE | (employee_id, year) | One record per employee per year |

**Note:** Like `leave_rules`, this table grows extra columns via `ALTER TABLE` when custom leave types are added.

#### `leave_types`
| Column | Type | Notes |
|---|---|---|
| id | VARCHAR(36) PK | UUID |
| name | VARCHAR(255) | Display name |
| code | VARCHAR(100) | Slug used as FK/column key |
| color | VARCHAR(50) | Hex color for UI |
| description | TEXT | |
| default_days | INT DEFAULT 14 | |
| status | VARCHAR(20) | |

#### `settings`
| Column | Type | Notes |
|---|---|---|
| setting_key | VARCHAR(100) PK | |
| setting_value | MEDIUMTEXT | |

Current known settings keys: `company_logo` (base64), `theme_color`, `theme_color_secondary`, `company_name`.

---

## 5. Backend — Express API

### 5.1 Server Entry (`server/index.js`)

- Express 5 app running on port `5005`
- CORS is fully open (no origin restriction)
- Body size limit: 50 MB (to support base64 logo uploads)
- Static SPA fallback: serves `dist/index.html` for all unmatched routes
- **No authentication middleware — all API endpoints are publicly accessible**
- **No rate limiting, no input sanitisation library**

### 5.2 API Endpoints

#### `/api/branches`
| Method | Path | Action |
|---|---|---|
| GET | `/api/branches` | List all branches |
| POST | `/api/branches` | Create branch; auto-generates default leave rules for all existing roles |
| PUT | `/api/branches/:id` | Update branch; re-links manager |
| DELETE | `/api/branches/:id` | Delete branch |

#### `/api/departments`
| Method | Path | Action |
|---|---|---|
| GET | `/api/departments` | List all departments |
| POST | `/api/departments` | Create department |
| PUT | `/api/departments/:id` | Update department |
| DELETE | `/api/departments/:id` | Delete department |

#### `/api/roles`
| Method | Path | Action |
|---|---|---|
| GET | `/api/roles` | List all roles |
| POST | `/api/roles` | Create role; auto-generates default leave rules for all existing branches |
| PUT | `/api/roles/:id` | Update role |
| DELETE | `/api/roles/:id` | Delete role |

#### `/api/employees`
| Method | Path | Action |
|---|---|---|
| GET | `/api/employees` | List all employees (**includes secret_code in response**) |
| POST | `/api/employees` | Create employee |
| PUT | `/api/employees/:id` | Update employee (optionally update secret_code) |
| DELETE | `/api/employees/:id` | Delete employee |

#### `/api/managers`
| Method | Path | Action |
|---|---|---|
| GET | `/api/managers` | List managers (no password hash exposed) |
| POST | `/api/managers/login` | Login: returns manager record if credentials match |
| POST | `/api/managers` | Create manager |
| PUT | `/api/managers/:id` | Update manager (optionally update password) |
| DELETE | `/api/managers/:id` | Delete manager |

**Note:** Login returns a raw DB record; there is no JWT or session token issued. The client simply stores the returned user object in React state (lost on page refresh). No persistent session exists.

#### `/api/rules`
| Method | Path | Action |
|---|---|---|
| GET | `/api/rules` | List all leave rules |
| POST | `/api/rules` | Create or upsert rule (ON DUPLICATE KEY UPDATE) |
| PUT | `/api/rules/:id` | Update rule |

#### `/api/applications`
| Method | Path | Action |
|---|---|---|
| GET | `/api/applications` | List all applications (all employees, all branches) |
| POST | `/api/applications` | Submit application (employee or manager override) |
| PUT | `/api/applications/:id/status` | Approve / Reject application |
| PUT | `/api/applications/:id/confirm` | Substitute confirms agreement via secret code |
| DELETE | `/api/applications/:id` | Undo/delete pending application |
| GET | `/api/applications/overview/:secretCode` | Personal leave overview for an employee |

**Application submission business logic:**
1. Validate `secretCode` → look up employee (or use `isManagerOverride` + direct employee_id)
2. Check `leave_rules` for the employee's role+branch; reject if missing
3. Create `leave_balances` row for current year if absent
4. Check leave balance quota — reject if used days + requested days > quota
5. For each leave date: check `max_per_day` (how many people per role+branch per day) — reject if at or over limit
6. For each leave date: check if the applicant themselves is assigned as a substitute for someone else
7. For each leave date: check if the chosen substitute is already substituting someone else
8. Insert `leave_applications` record
9. Insert individual rows in `leave_application_dates`
10. Update `leave_balances` taken count

**Known bug in application submission:** Line 105 of `applications.js` references `balances[balanceCol]` but the variable is named `takenRows[0]`. This causes a runtime `ReferenceError` that prevents leave balance checking from working correctly.

#### `/api/settings`
| Method | Path | Action |
|---|---|---|
| GET | `/api/settings` | Returns all settings as key-value object |
| PUT | `/api/settings` | Upserts any number of key-value pairs |

#### `/api/leave-types`
| Method | Path | Action |
|---|---|---|
| GET | `/api/leave-types` | List all leave types |
| POST | `/api/leave-types` | Create leave type + dynamically ALTER TABLE to add columns |
| PUT | `/api/leave-types/:id` | Update leave type (name, color, days, status) |
| DELETE | `/api/leave-types/:id` | Delete leave type (columns in leave_rules/leave_balances are NOT dropped) |

---

## 6. Frontend — React SPA

### 6.1 Routing (`src/main.jsx`)

| Path | Component |
|---|---|
| `/*` | `App` (Employee Portal) |
| `/admin` | `AdminApp` (Admin Panel) |

There is no route guard. Anyone can navigate to `/admin`. The admin panel shows a login form, but it is a client-side gate only — API endpoints have no server-side auth.

### 6.2 Employee Portal (`src/App.jsx`)

**State loaded on mount:** branches, roles, employees, all applications (every employee), settings, leave types.

**Note: The entire employee list (with secret codes) and all applications from all employees across all branches are loaded in full to every browser that visits the portal. This is a significant data exposure issue.**

#### Views / Pages (managed by a `page` state, not router paths):

| State | Component | Description |
|---|---|---|
| `'form'` | inline JSX | Leave application form |
| `'list'` | `LeaveList` | Employee's own application history |
| `'overview'` | `LeaveOverview` | Personal leave balance, heatmap, history |
| `'substitutions'` | `SubstitutionsList` | Substitution requests where this employee is the substitute |

#### Leave Application Form Fields:
- **Employee Secret Code** (password input) — identifies the applicant; used as a lookup key against the in-memory employees list
- **Leave Type** — dropdown populated from `leave_types` (falls back to hardcoded annual/sick/casual if empty)
- **Leave Dates** — multi-date picker (add/remove individual dates)
- **Returning Date** — auto-calculated as the day after the last selected leave date (read-only)
- **Substitute** — dropdown filtered to same branch + same role, excluding those who have overlapping leave or substitution commitments

**Validation:**
- Leave must be applied at least 3 days in advance (client-side only — server doesn't enforce this)
- Substitute must be available (checked client-side and server-side)
- Leave balance checked server-side

#### Substitution Confirmation Modal:
When a substitute clicks "Agree", they enter their own secret code. This is sent to `PUT /api/applications/:id/confirm` which verifies the code matches the assigned substitute and sets `substitute_confirmed = true`.

### 6.3 Employee: Leave List (`src/LeaveList.jsx`)

- Shows only the logged-in employee's own applications (filtered client-side from full list)
- Filter tabs: All / Pending / Approved / Rejected
- Expandable card per application showing details
- "Undo Application" button — only available for `pending` applications; calls `DELETE /api/applications/:id`

### 6.4 Employee: Leave Overview (`src/LeaveOverview.jsx`)

- Fetches personal overview via `GET /api/applications/overview/:secretCode`
- Displays:
  - Employee info card (name, role, branch, department)
  - Balance cards: taken/remaining days for each leave type (annual, sick, casual — hardcoded three types)
  - Annual heatmap: 12-month calendar grid with colored day squares per leave status
  - Leave history list with expandable cards and status filter tabs

### 6.5 Employee: Substitutions List (`src/SubstitutionsList.jsx`)

- Shows applications where the logged-in employee is the `substitute_employee_id`
- Filter: All / Pending / Confirmed
- Expandable cards; pending ones show "Agree to Substitute" button

### 6.6 Admin Portal (`src/admin/AdminApp.jsx`)

**Login:** Username/password form → calls `POST /api/managers/login` → stores returned user in React state.

**Session persistence:** None. Refreshing the page logs out the manager.

**Two manager roles:**
- `manager` — Can see Dashboard, Manage Employees, Leave Overview (filtered to own branch only)
- `super manager` — Full access to all pages across all branches

**Sidebar navigation groups:**
- **Operation:** Dashboard, Manage Employees, Leave Overview
- **Management:** Manage Managers, Manage Branches, Manage Departments, Manage Roles, Manage Leave Types
- **System:** Settings

(Management and System groups are only shown to `super manager`)

**Features present in `AdminPages.jsx` (3698 lines, all in one file):**

| Page Component | Functionality |
|---|---|
| `AdminDashboard` | All applications table with status/branch filter and search; approve/reject buttons; monthly calendar view of team leave; "Special Leave" modal for manager-override application submission; quick stats counts |
| `ManageEmployees` | CRUD employees; view per-employee leave balance and leave rule; inline balance editing |
| `ManageBranches` | CRUD branches; assign manager to branch |
| `ManageManagers` | CRUD managers; assign role (`manager` / `super manager`) and branch |
| `ManageDepartments` | CRUD departments |
| `ManageRoles` | CRUD roles; link to departments |
| `ManageLeaveTypes` | CRUD custom leave types with name, code, color, default days, status |
| `AccountSettings` | Modal: change own password |
| `SystemSettings` | Upload company logo (base64), set company name, choose theme colors (primary + secondary) |
| `LeaveOverview` (admin) | Yearly leave heatmap for the whole team; filterable by employee, branch, department |

---

## 7. Business Logic Summary

### 7.1 Substitution Workflow
1. Applicant selects a colleague from same branch+role as substitute.
2. Application saved with `substitute_confirmed = false`.
3. The substitute logs into the employee portal with their secret code.
4. They navigate to "Substitutions" and see pending requests.
5. They click "Agree" → confirm with their secret code.
6. Server verifies code → sets `substitute_confirmed = true`.

### 7.2 Leave Balance Accounting
- On application submission: `{leave_type}_taken` is incremented in `leave_balances` immediately.
- On application rejection: `{leave_type}_taken` is decremented.
- On re-approval of a rejected application: `{leave_type}_taken` is re-incremented.
- On delete (undo) of pending application: `{leave_type}_taken` is decremented.
- **Approved applications that are later not acted upon still hold their quota reservation.**

### 7.3 Leave Rules Auto-Generation
- When a new **branch** is created → a default `leave_rules` row is inserted for every existing role.
- When a new **role** is created → a default `leave_rules` row is inserted for every existing branch.

### 7.4 Custom Leave Types
- Adding a leave type → `ALTER TABLE leave_rules ADD COLUMN {code}_leave INT DEFAULT {default_days}` and `ALTER TABLE leave_balances ADD COLUMN {code}_taken INT DEFAULT 0`.
- These schema changes are not tracked in `schema.sql`.
- Deleting a leave type does **not** drop the added columns.

### 7.5 Manager Override Applications
- Via "Special Leave" modal in Admin Dashboard.
- Manager selects an employee, sets leave type, dates, substitute, and status directly.
- Bypasses: 3-day advance requirement, employee secret code lookup.
- Does **not** bypass quota or max-per-day checks (these still run).

---

## 8. Security Analysis

| Issue | Severity | Description |
|---|---|---|
| No API authentication | Critical | All 9 route groups are publicly accessible with no token/session required |
| Secret codes exposed in API | Critical | `GET /api/employees` returns `secretCode` for every employee |
| All data fetched client-side | Critical | Full employee list, all applications across all branches loaded into every browser |
| SHA-256 password hashing | High | Not a password hashing algorithm; bcrypt/argon2 should be used instead |
| No session / JWT | High | Admin login is stored in React state only; no server-side session |
| No CORS restriction | High | CORS is fully open (`app.use(cors())`) |
| No input validation library | Medium | All route handlers do manual checks; no joi/zod/express-validator |
| Dynamic SQL column names | Medium | `ALTER TABLE` with user-supplied leave type codes — validated only by regex `/^[a-z0-9_]+$/` |
| Client-side 3-day advance rule | Low | The 3-day advance leave requirement is only enforced in the browser |
| No rate limiting | Low | Login endpoints and application submission have no rate limiting |
| Base64 logos stored in DB | Low | 50 MB request body limit; logos stored as MEDIUMTEXT in `settings` table |

---

## 9. Known Bugs

| Location | Bug |
|---|---|
| `server/routes/applications.js` line ~105 | References `balances[balanceCol]` but variable is `takenRows[0]` → ReferenceError; quota check crashes silently |
| `db/new_dump.sql` | Contains PostgreSQL-format SQL (`"public"."table_name"`) — will fail on MySQL |
| `LeaveOverview.jsx` | Balance cards hardcode three leave types (annual, sick, casual); custom leave types are not shown |
| `AdminPages.jsx` | `department` field in applications is shown as `'N/A'` (marked as deprecated) |

---

## 10. What Is Currently Working

- ✅ Employee self-service leave application form
- ✅ Multi-date leave selection (non-contiguous days)
- ✅ Substitute selection with conflict detection (same role + branch, no overlapping leave/sub)
- ✅ Substitution confirmation via secret code
- ✅ Employee leave history list with status filter
- ✅ Employee leave balance overview with annual heatmap
- ✅ Admin login (stateless, session lost on refresh)
- ✅ Admin leave application dashboard with approve/reject
- ✅ Admin calendar view of team leave
- ✅ Admin "Special Leave" override submission
- ✅ CRUD for branches, departments, roles, employees, managers, leave types
- ✅ Leave rules configuration per role+branch
- ✅ Custom leave types with dynamic schema extension
- ✅ System settings: company logo (base64), company name, theme colors (13 presets)
- ✅ Role-based admin access (manager vs. super manager)
- ✅ Admin leave overview heatmap for team

---

## 11. What Is Missing vs. a Professional System

- ❌ Server-side authentication middleware (JWT or sessions)
- ❌ Employee login portal (proper auth, not just secret code lookup)
- ❌ Notification system (email/SMS when leave is applied, approved, rejected, substitute requested)
- ❌ Leave carry-forward / accrual logic
- ❌ Holiday/public holiday calendar integration (leaves on holidays should not count)
- ❌ Partial-day leave support (half-day)
- ❌ Leave cancellation workflow (requesting cancellation of an approved leave)
- ❌ Attachment support (medical certificates for sick leave)
- ❌ Multi-level approval workflow (e.g., team lead → HR → director)
- ❌ Leave policy by employment type (full-time, part-time, contract)
- ❌ Audit log / history of status changes
- ❌ Export to PDF / Excel
- ❌ Reports and analytics dashboard
- ❌ Pagination / server-side filtering (all data fetched at once)
- ❌ Password reset / forgot password flow
- ❌ Persistent admin session (JWT token stored in localStorage/cookie)
- ❌ RBAC middleware enforced server-side
- ❌ Input validation (joi/zod) on all routes
- ❌ Error logging / monitoring (no Sentry, no Winston logger)
- ❌ Database migrations (no migration tool — raw SQL files only)
- ❌ Test suite (no unit or integration tests)
- ❌ CI/CD pipeline
- ❌ API versioning (`/api/v1/...`)

---

## 12. Data Flow Diagram

```
[Employee Browser]
  │ Loads ALL employees, applications, branches, roles
  │ (no auth, no pagination)
  ▼
[React App.jsx]
  ├── Form submit → POST /api/applications (secretCode in body)
  ├── Substitute confirm → PUT /api/applications/:id/confirm (secretCode in body)
  └── View history → filtered client-side from full loaded dataset

[Admin Browser → /admin]
  │ POST /api/managers/login → returns user object (stored in React state only)
  ▼
[React AdminApp.jsx]
  ├── Loads ALL applications, employees, branches, managers, departments, roles, rules
  ├── PUT /api/applications/:id/status (no server auth check)
  └── CRUD all entities via API (no server auth check)

[Express Server :5005]
  └── MySQL Connection Pool (10 connections)
      └── leave_system database
```

---

## 13. File Size & Complexity Notes

| File | Lines | Notes |
|---|---|---|
| `src/admin/AdminPages.jsx` | 3,698 | All admin pages in one file — needs decomposition |
| `server/routes/applications.js` | 440 | Core business logic; contains a known bug |
| `src/App.jsx` | 577 | Main employee portal; mix of UI and business logic |
| `src/admin/admin.css` | ~41 KB | Very large single CSS file |
| `db/data_clean.sql` | ~132 KB | Large data dump; no migrations |

---

*Generated by full codebase scan on 2026-09-16. All file paths are relative to `/Users/sakunakavinda/Documents/Web/leave_system/`.*
