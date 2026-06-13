# 🧑‍💼 Nexus HR — Enterprise HR Management Suite

> A production-grade, full-stack **Human Resources Management Dashboard** built with Node.js, Express, MongoDB, and Vanilla JS. Manage your entire workforce — employee records, departments, roles, admin profiles, and system preferences — all secured behind a real JWT-based authentication system with persistent database state.

---

## 🚀 Features

### 👥 Employee Management (CRUD)
- **Full Employee CRUD** — Add, edit, and delete employee records with live table updates and custom confirmation modals
- **Live Dashboard Metrics** — Real-time stat cards showing total headcount, department distribution, new hires, and workforce activity feed
- **Advanced Filtering & Pagination** — Search by name/ID, filter by department, and paginate large datasets with smart controls
- **Reports Panel** — Export-ready report listings with downloadable records by period

### 🔐 Authentication System (Real Database-Backed)
- **JWT-based sessions** stored in `httpOnly` secure cookies (`nexus_token`) — immune to XSS token theft
- **Sign In & Sign Up** — Both flows authenticate against MongoDB `admins` collection with `bcryptjs`-hashed passwords (12 salt rounds)
- **Session guard** on every page load via `GET /api/auth/me` — no client-side tricks
- **Auto-seeded admin** account on server start (`admin@nexushr.com` / `Admin@123`)
- **Remember Me** — 8-hour JWT expiry with localStorage/sessionStorage hybrid session caching

### ⚙️ Suite Settings
- **Admin Profile Editor** — Update name and email, persisted to MongoDB, with live DOM header sync (no page reload)
- **Change Password** — Bcrypt re-verification, new hash saved, fresh JWT cookie issued seamlessly
- **Dynamic Tag/Chip UI** — Add or remove allowed Departments and Roles with interactive chips that feed `window.nexusConfig` globally
- **`window.nexusConfig`** — Global state ensures employee form dropdowns stay in sync with admin-defined permission lists

### 🎛️ User Preferences
- **Full-stack preference toggle** — Single button call hits `POST /api/preferences/toggle-ui-mode`, persists state in MongoDB
- **Optimistic UI update** — Layout updates instantly on click; rolls back gracefully on API failure
- **Dynamic theming** — Smooth CSS transitions adapt the dashboard appearance based on saved preferences
- **Layout integrity preserved** — Flexbox/Grid constraints keep all content readable, interactive, and within viewport bounds
- **Persisted across sessions** — Preference state rehydrated from DB on every `GET /api/auth/me` call

---

## 📸 Screenshots & Demos

> 📂 All screenshots live in [`assets/screenshots/`](assets/screenshots/). Drop your images there and they will render automatically below.

---

### 🏠 Dashboard & Settings

| Dashboard View | Suite Settings |
|:-----------:|:----------------:|
| ![Nexus HR Dashboard showing employee stat cards and table](assets/screenshots/dashboard.png) | ![Settings panel with admin profile editor and department/role tags](assets/screenshots/settings-panel.png) |
| Live stat cards, employee table, department filters | Admin profile editor, password change, preferences card |

---

### 👥 Employee Management

| Employee List | Add Employee |
|:-----------:|:----------------:|
| ![Full employee records table with search, filter, and pagination controls](assets/screenshots/employee-list.png) | ![Add Employee modal form with fields for name, department, role, and status](assets/screenshots/add-employee.png) |
| Full employee table with search, filter by department, and pagination | Add Employee form with dynamic department & role dropdowns |

---

### 🔐 Authentication

| Login Page | Sign Up Page |
|:-----------:|:----------------:|
| ![Login page with email and password fields](assets/screenshots/login-page.png) | ![Sign Up page for creating a new admin account](assets/screenshots/signup-page.png) |
| Secure JWT login with Remember Me option | New admin registration stored directly in MongoDB |

---

## 🛠️ Tech Stack

### Frontend
- ![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white) **Vanilla HTML5** — Semantic, accessible markup
- ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white) **Vanilla CSS3** — Custom design system with CSS variables, transitions, and keyframe animations
- ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black) **Vanilla ES2022+ JavaScript** — Async/await API calls, optimistic UI, DOM state management
- ![Bootstrap](https://img.shields.io/badge/Bootstrap_5-7952B3?style=flat&logo=bootstrap&logoColor=white) **Bootstrap 5.3** — Grid system and utilities only (no component overrides)

### Backend
- ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white) **Node.js** — Runtime environment
- ![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white) **Express 5** — REST API routing with `cookie-parser` middleware
- ![JWT](https://img.shields.io/badge/JWT-000000?style=flat&logo=jsonwebtokens&logoColor=white) **jsonwebtoken** — Signed 8-hour session tokens
- **bcryptjs** — Password hashing (12 salt rounds)
- ![Nodemon](https://img.shields.io/badge/Nodemon-76D04B?style=flat&logo=nodemon&logoColor=white) **Nodemon** — Hot-reloading development server

### Database
- ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white) **MongoDB Atlas** — Cloud-hosted replica set cluster
- ![Mongoose](https://img.shields.io/badge/Mongoose-880000?style=flat&logo=mongoose&logoColor=white) **Mongoose 9** — Schema modeling, validation, and typed queries

---

## ⚙️ Architecture & System Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NEXUS HR — SYSTEM FLOW                       │
└─────────────────────────────────────────────────────────────────────┘

  [Browser / Client]
       │
       │  User updates a preference or submits a settings form
       │
       ▼
  ┌──────────────────────────────────┐
  │     OPTIMISTIC UI UPDATE         │  ← DOM updated instantly
  │  document.body.classList.add(    │     No wait for network round-trip
  │    'ui-preference-active'        │
  │  )                               │
  └──────────────┬───────────────────┘
                 │
                 │  POST /api/preferences/toggle-ui-mode
                 │  Cookie: nexus_token (httpOnly JWT)
                 ▼
  ┌──────────────────────────────────┐
  │         EXPRESS BACKEND          │
  │                                  │
  │  1. verifyToken middleware        │  ← 401 if cookie missing/invalid
  │  2. Admin.findById(req.adminId)   │
  │  3. admin.uiModeEnabled =        │  ← Atomic boolean flip
  │       !admin.uiModeEnabled       │
  │  4. await admin.save()           │
  │  5. return { uiModeEnabled }     │
  └──────────────┬───────────────────┘
                 │
                 │  Mongoose write to Atlas
                 ▼
  ┌──────────────────────────────────┐
  │        MONGODB ATLAS             │
  │                                  │
  │  admins collection               │
  │  { uiModeEnabled: true }         │  ← Persisted, survives reboots
  └──────────────┬───────────────────┘
                 │
                 │  200 OK { uiModeEnabled: true }
                 ▼
  ┌──────────────────────────────────┐
  │     COMMIT / ROLLBACK UI         │
  │                                  │
  │  ✅ Success → confirm class       │
  │  ❌ Failure → rollback class +    │
  │              toast error          │
  └──────────────────────────────────┘

  [On every page load — GET /api/auth/me]
       Rehydrates saved preferences from DB into window.nexusConfig
       and applies UI state automatically — persists across refreshes.
```

### API Endpoints Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | ❌ | Create new admin account |
| `POST` | `/api/auth/login` | ❌ | Authenticate and set JWT cookie |
| `POST` | `/api/auth/logout` | ❌ | Clear JWT cookie |
| `GET`  | `/api/auth/me` | ✅ | Get current session + profile |
| `PUT`  | `/api/admin/profile` | ✅ | Update name, email, departments, roles |
| `PUT`  | `/api/admin/change-password` | ✅ | Re-hash password, reissue JWT |
| `GET`  | `/api/preferences` | ✅ | Fetch current user preferences |
| `POST` | `/api/preferences/toggle-ui-mode` | ✅ | Toggle UI preference state in DB |
| `GET`  | `/api/employees` | ✅ | List all employees |
| `POST` | `/api/employees` | ✅ | Add new employee |
| `PUT`  | `/api/employees/:id` | ✅ | Update employee record |
| `DELETE` | `/api/employees/:id` | ✅ | Delete employee record |

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:

- **Node.js** `>= 18.x` — [Download](https://nodejs.org/)
- **npm** `>= 9.x` — Included with Node.js
- **MongoDB Atlas** account — [Create free cluster](https://www.mongodb.com/atlas)
- **Git** — [Download](https://git-scm.com/)

---

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/zaaraf027-glitch/HR-mgt-Dashboard.git
cd HR-mgt-Dashboard
```

**2. Install all dependencies**

```bash
npm install
```

**3. Configure environment variables** *(see section below)*

**4. Start the development server**

```bash
npm run dev
```

The server will start at **`http://localhost:5000`** and automatically redirect to the login page.

> ℹ️ **Nodemon** watches for file changes and hot-reloads the server automatically.

---

### Environment Variables

Create a **`.env`** file in the project root with the following keys:

```env
# ─── MongoDB Connection ─────────────────────────────────────────────
# Your full MongoDB Atlas connection string
# Encode special characters in password with URL encoding (e.g., @ → %40)
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority

# ─── JWT Secret ─────────────────────────────────────────────────────
# Strong random string — change this before going to production!
JWT_SECRET=your_super_secret_jwt_key_change_in_production

# ─── Server Port ────────────────────────────────────────────────────
# Optional — defaults to 5000
PORT=5000

# ─── Node Environment ───────────────────────────────────────────────
# Set to "production" on live server (enables secure cookies over HTTPS)
NODE_ENV=development
```

> ⚠️ **Never commit your `.env` file.** It is already listed in `.gitignore`.

---

### Default Admin Account

On first server start, the seeder automatically creates:

| Field | Value |
|-------|-------|
| **Email** | `admin@nexushr.com` |
| **Password** | `Admin@123` |
| **Role** | `HR Director` |

You can change these credentials from the **Suite Settings** panel after logging in.

---

## 🧪 Testing the System

### E2E Full-Stack Integration Test

Follow these steps to verify the complete **Frontend → Backend → Database** integration:

**Step 1 — Start the server and log in**
```bash
npm run dev
# Visit http://localhost:5000
# Log in with admin@nexushr.com / Admin@123
```

**Step 2 — Add a new employee via the Dashboard**
1. Click **"Add Employee"** in the top-right of the employee table
2. Fill in the form (name, department, role, status) and submit
3. Observe the **optimistic UI update** — the new record appears in the table immediately
4. A success toast confirms: *"Employee added successfully."*

**Step 3 — Verify database persistence via Settings**
1. Navigate to **Suite Settings** → check the **Allowed Departments** and **Allowed Roles** tags
2. Confirm that any changes made are reflected across the employee add/edit dropdowns — no page reload needed

**Step 4 — Verify via API directly (Postman / curl)**
```bash
# First, login to get the cookie
curl -c cookies.txt -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nexushr.com","password":"Admin@123"}'

# Fetch all employees
curl -b cookies.txt http://localhost:5000/api/employees

# Fetch current admin preferences
curl -b cookies.txt http://localhost:5000/api/preferences
```

**Expected response (employees):**
```json
[
  { "_id": "...", "name": "Jane Doe", "department": "Engineering", "role": "Senior Dev", "status": "Active" }
]
```

**Step 5 — Verify session persistence on page reload**
1. Hard-reload the page (`Ctrl+Shift+R`)
2. After `GET /api/auth/me` resolves, the dashboard reloads your profile and preferences automatically
3. You remain logged in and all employee data is intact — **confirming DB persistence**

**Step 6 — Test rollback on network failure**
1. In DevTools → Network tab → select **"Offline"** mode
2. Try submitting a form update
3. Observe: UI updates optimistically, then **rolls back** after the request fails
4. Error toast: *"Failed to sync changes with server."*

---

### Running All API Routes Health Check

```bash
# Check server is alive and employees endpoint is reachable
curl http://localhost:5000/api/employees

# Expected: Array of employee objects (or empty array on fresh install)
```

---

## 📁 Project Structure

```
HR-mgt-Dashboard/
│
├── client/                       # Frontend (static files served by Express)
│   ├── index.html                # Main dashboard SPA shell
│   ├── login.html                # Authentication page (login & sign up)
│   ├── css/
│   │   ├── style.css             # Dashboard design system & component styles
│   │   └── login.css             # Login / Sign Up page styles
│   └── js/
│       ├── app.js                # Core dashboard logic, auth guard, settings, preferences
│       └── login.js              # Authentication form handler (login & register)
│
├── server/
│   ├── model/
│   │   ├── admin.js              # Mongoose Admin schema (profile, credentials, preferences)
│   │   └── employee.js           # Mongoose Employee schema
│   ├── middleware/
│   │   └── auth.js               # verifyToken middleware (cookie + Bearer header)
│   └── routes/
│       ├── authRoutes.js         # /api/auth/* (login, register, logout, me, seeder)
│       ├── adminRoutes.js        # /api/admin/* (profile update, change-password)
│       ├── employeeRoutes.js     # /api/employees CRUD
│       └── preferencesRoutes.js  # /api/preferences (get, toggle-ui-mode)
│
├── server.js                     # Express app entry point
├── .env                          # Environment variables (not committed)
├── .gitignore
├── package.json
└── README.md
```

---

## 🔒 Security Notes

- **JWT tokens** are stored in `httpOnly` cookies — inaccessible to JavaScript, preventing XSS token theft
- **`sameSite: 'strict'`** cookie attribute — blocks CSRF attacks from cross-origin requests
- **`secure: true`** in production — cookies only transmitted over HTTPS
- **bcrypt (12 rounds)** — computationally expensive hashing makes brute-force impractical
- **Backend field validation** — all API inputs validated server-side, never trust the client
- **Email uniqueness** enforced at both Mongoose schema level and registration endpoint

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to your fork: `git push origin feature/your-feature-name`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ☕ by the Nexus HR Team**

[![GitHub](https://img.shields.io/badge/GitHub-zaaraf027--glitch-181717?style=flat&logo=github)](https://github.com/zaaraf027-glitch/HR-mgt-Dashboard)

</div>
