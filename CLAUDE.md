# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

### Backend (Express + TypeScript)
```bash
cd backend
npm install          # Install dependencies
npm run dev          # Development server with hot reload (port 5000)
npm run build        # Compile TypeScript to dist/
npm start            # Run production build
npm run lint         # Run ESLint
```

### Frontend (React + Vite + Capacitor)
```bash
cd frontend
npm install          # Install dependencies
npm run dev          # Development server (port 3000, proxies /api to :5000)
npm run build        # Production build (tsc + vite)
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run cap:sync     # Sync Capacitor native projects
npm run cap:android  # Open Android Studio
npm run cap:ios      # Open Xcode
```

### Database Setup
```bash
mysql -u root -p < backend/database/schema.sql
```

## Architecture

### Backend (`backend/src/`)
- **app.ts** - Express app with middleware stack: helmet → cors → json → cookies → rate limiter → routes
- **controllers/** - Route handlers for auth, categories, transactions, budgets, rules, plaid, admin
- **middleware/** - Auth (JWT verification), validation (express-validator), rate limiting, admin role checks
- **models/** - Database operations using parameterized queries (user, token, category, transaction, budget, rule, learned_pattern, plaid_item, plaid_account)
- **services/** - Business logic including token management, email, password hashing, encryption, Plaid integration, categorization ML
- **routes/** - API route definitions mapping endpoints to controllers
- **config/** - Configuration object and MySQL connection pool

### Frontend (`frontend/src/`)
- **App.tsx** - React Router with ProtectedRoute, PublicRoute, and AdminRoute wrappers
- **context/AuthContext.tsx** - Auth state provider with useAuth() hook, 30-min inactivity logout
- **screens/** - Page components for auth, dashboard, transactions, budgets, categories, rules, accounts, settings, admin
- **components/** - Reusable UI (Button, Input, Modal, Alert, Spinner, TransactionItem, BudgetCard, BottomNav, etc.)
- **services/api.ts** - Axios instance with token interceptors and automatic refresh on 401
- **i18n/** - i18next setup with English and Spanish translations
- **styles/** - Plain CSS with custom properties in variables.css for theming

### Auth Flow
1. Register → hash password (bcrypt cost 12) → create user → send verification email
2. Login → verify email confirmed → generate JWT (15min) + refresh token (7d, hashed in DB)
3. Protected routes check Bearer token in Authorization header
4. Refresh tokens stored hashed; one-time use tokens for email verification and password reset

### Role-Based Access
- **user** - Standard user access
- **admin** - User management capabilities
- **super_admin** - Full system access

## Key Configuration

- Backend config: `backend/.env` (copy from `.env.example`)
- Frontend uses Vite proxy in development; set `VITE_API_URL` for production API endpoint
- TypeScript strict mode enabled in both projects
- Path alias `@/*` maps to `frontend/src/*`

## API Routes

- `/api/auth/*` - Authentication (register, login, logout, refresh, password reset, email verification)
- `/api/categories/*` - Category CRUD
- `/api/transactions/*` - Transaction CRUD with filtering and Plaid sync
- `/api/budgets/*` - Budget management with spent tracking
- `/api/rules/*` - Categorization rule management
- `/api/plaid/*` - Plaid link tokens, account linking, transaction sync
- `/api/admin/*` - User management, system stats (admin only)
- `/api/health` - Health check

## Database Schema

Auth tables: users, email_verification_tokens, password_reset_tokens, refresh_tokens

Feature tables: categories, transactions, budgets, rules, learned_patterns, plaid_items, plaid_accounts

## Rate Limits

- General: 100 requests per 15 minutes
- Auth endpoints: 10 requests per 15 minutes
- Password reset: 5 requests per 60 minutes
