# PetVital (Pet Parent) - Codebase Analysis

## Overview

**Pet Parent** is an AI-powered pet health triage application built with Node.js/Express and vanilla JavaScript frontend, deployed on Vercel.

| Aspect | Technology |
|--------|-----------|
| Backend | Node.js + Express 5 |
| Database | Neon PostgreSQL (+ in-memory mock for local dev) |
| AI | OpenAI GPT-4 |
| Auth | JWT + bcryptjs |
| Deployment | Vercel serverless |
| Storage | Vercel Blob (pet photos) |
| PDF | pdfkit |

---

## Architecture

### Backend (`/server`)

```
server/
├── index.js           # Express app setup, middleware, routing
├── config/index.js    # Environment configuration
├── middleware/auth.js  # JWT authentication middleware
├── lib/
│   ├── db.js          # Neon PostgreSQL connection
│   ├── mockStore.js   # In-memory mock DB for local dev
│   └── openai.js      # OpenAI GPT-4 integration
└── routes/
    ├── auth.js        # Signup, login, logout, profile
    ├── pets.js        # Pet CRUD
    ├── triage.js      # AI symptom assessment
    ├── chat.js        # AI pet care chat
    ├── journal.js     # Health journal entries
    ├── upload.js      # Photo uploads (Vercel Blob)
    ├── export.js      # PDF exports
    └── vets.js        # Vet clinic directory (public)
```

### Frontend (`/public`)

Vanilla JS multi-page application (no framework). 13 HTML pages with shared CSS and modular JS.

```
public/
├── index.html         # Landing page
├── login.html / signup.html
├── dashboard.html     # Main dashboard
├── pets.html / add-pet.html
├── triage.html        # 3-step symptom checker
├── chat.html          # AI chatbot
├── journal.html       # Health journal
├── history.html       # Triage history
├── vets.html          # Vet finder
├── css/
│   ├── style.css      # Base styles & variables
│   └── components.css # Reusable component styles
└── js/
    ├── config.js      # API URL config
    ├── utils.js       # Constants & helpers
    ├── api.js         # Centralized API wrapper
    ├── auth.js        # Auth flow (login/signup/logout)
    └── [page].js      # Page-specific scripts
```

---

## Database Schema

5 tables with UUID primary keys:

| Table | Purpose |
|-------|---------|
| `users` | Accounts (email, password_hash, name, language) |
| `pets` | Pet profiles (species, breed, age, weight, health info, lifestyle) |
| `triage_history` | AI assessment records (symptoms, urgency, AI response JSON) |
| `journal_entries` | Health journal (7 entry types, JSONB metadata) |
| `vet_clinics` | Veterinary directory (public, with geo data) |

---

## API Endpoints

### Auth (`/api/auth`) — Protected unless noted
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/signup` | Register (public) |
| POST | `/login` | Login (public) |
| POST | `/logout` | Logout |
| GET | `/profile` | Get profile |
| PUT | `/profile` | Update profile |

### Pets (`/api/pets`)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | List user's pets |
| GET | `/:id` | Get pet |
| POST | `/` | Create pet |
| PUT | `/:id` | Update pet |
| DELETE | `/:id` | Delete pet |

### Triage (`/api/triage`) — Rate limited: 20 req/hr
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/` | AI symptom assessment |
| GET | `/history` | Triage history (filterable) |
| GET | `/history/:id` | Single record |

### Chat (`/api/chat`) — Rate limited: 50 req/hr
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/` | AI pet care Q&A |

### Journal (`/api/journal`)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | List entries (filterable) |
| GET | `/:id` | Get entry |
| POST | `/` | Create entry |
| PUT | `/:id` | Update entry |
| DELETE | `/:id` | Delete entry |

### Other
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/upload` | Upload pet photo |
| GET | `/api/export/triage/:id` | Export triage as PDF |
| GET | `/api/export/pet/:id/summary` | Export pet summary PDF |
| GET | `/api/vets` | List vet clinics (public) |
| GET | `/api/health` | Health check |

---

## Security Measures

- **Helmet.js** CSP headers (with `'unsafe-inline'` for scripts)
- **CORS** enabled (permissive — all origins)
- **Rate limiting** via express-rate-limit (IP-based)
- **JWT auth** with 7-day expiry
- **bcryptjs** password hashing (12 salt rounds)
- **Parameterized SQL** queries (prevents injection)
- **UUID primary keys**
- **Trust proxy** for Vercel

---

## AI Integration

| Feature | Model | Temperature | Purpose |
|---------|-------|-------------|---------|
| Triage | GPT-4 | 0.3 | Symptom assessment with structured JSON output |
| Chat | GPT-4 | 0.7 | General pet care Q&A with personalized context |

**Triage output**: urgency level, summary, possible conditions, immediate actions, home care, warning signs, vet guidance, timeline.

**Chat context**: Includes user's pet profiles, last 5 triage records, last 5 journal entries.

---

## Critical Issues Found

### Security (High Priority)

1. **Hardcoded default JWT secret** (`server/config/index.js`) — Fallback `'dev-secret-change-in-production'` allows token forgery if env var missing
2. **Overly permissive CORS** (`server/index.js`) — `cors()` with no origin restrictions
3. **`'unsafe-inline'` in CSP** (`server/index.js`) — Defeats XSS protection
4. **No file upload validation** (`server/routes/upload.js`) — No MIME type or size checks
5. **Mock store stores plain-text passwords** (`server/lib/mockStore.js`)

### Frontend (Medium Priority)

6. **XSS risk** — `innerHTML` used with user data; `escapeHtml()` not applied consistently
7. **`escapeHtml()` duplicated 7 times** across page scripts instead of in shared utils
8. **localStorage for JWT** — Accessible via XSS
9. **No token refresh mechanism** — Forces re-login after 7 days
10. **No debouncing** on form submissions (double-click = double request)

### Backend (Medium Priority)

11. **No pagination offset** — Only `limit`, no `skip`/`offset` on list endpoints
12. **10MB JSON limit** too high for most endpoints
13. **Inconsistent error response format** — Mix of `{ error: string }` and `{ error: { message } }`
14. **Missing ownership verification** in some export routes for mock DB
15. **No token refresh endpoint**

### Code Quality (Low Priority)

16. **No tests** — `npm test` is a stub
17. **Significant code duplication** across frontend scripts
18. **Magic strings** for urgency levels and entry types (should be constants)
19. **Missing accessibility** — No ARIA labels, keyboard nav, or screen reader support
20. **Incomplete `.env.example`** — Missing JWT_SECRET, BLOB_READ_WRITE_TOKEN, LOCAL_MODE

---

## Strengths

- Clean modular Express architecture with route separation
- Dual-mode (local mock / production DB) is great for development
- Comprehensive pet health data model
- Well-structured OpenAI prompts for medical guidance
- Parameterized queries prevent SQL injection
- Responsive mobile-first CSS design
- Centralized API wrapper on frontend

---

## Recommended Improvements (Priority Order)

1. **Fix security issues** — JWT secret validation, CORS restrictions, CSP, upload validation
2. **Add tests** — Unit tests for routes, integration tests for auth flow
3. **Deduplicate frontend code** — Move shared functions to utils.js
4. **Standardize error handling** — Consistent format across all endpoints
5. **Add pagination** — Offset/cursor support on list endpoints
6. **Implement token refresh** — Short-lived access + long-lived refresh tokens
7. **Accessibility audit** — ARIA labels, keyboard navigation, screen reader support
8. **API documentation** — OpenAPI/Swagger spec
