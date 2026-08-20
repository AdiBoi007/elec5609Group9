# Circle Health — Fitness & Nutrition Planner

Circle Health is a desktop-first fitness and nutrition planner with an Apple Health-inspired interface. It combines unified health logging, trackable goals, workout and nutrition planning, cross-domain progress analytics, deterministic wellness guidance and optional OpenAI-powered recommendations. Light, dark and system themes share one semantic design system.

## Tech Stack

### Frontend

- React 19 and TypeScript
- Vite
- Tailwind CSS
- React Router
- Recharts
- Lucide icons
- ZXing browser barcode scanning

### Backend

- Java 21+
- Spring Boot 3
- Spring Security with JWT
- Spring Data JPA / Hibernate
- PostgreSQL
- OpenAI Responses API integration
- Open Food Facts integration

## Architecture

```text
React browser application
        |
        | JSON REST API + JWT
        v
Spring Boot monolith
        |
        +---- PostgreSQL
        +---- OpenAI (optional)
        +---- Open Food Facts (optional)
```

The backend uses controller, service, repository, DTO, entity, security and configuration layers. API responses use DTOs rather than exposing JPA entities. All user-owned records are resolved from the authenticated account.

## Setup

### PostgreSQL

The easiest local setup uses Docker:

```bash
docker compose up -d postgres
```

This creates a `pulse` database with the local username and password `pulse`. Existing local PostgreSQL installations can be used by overriding the database environment variables.

### Backend

Java 21 or newer is required. The Maven wrapper is included.

```bash
cd backend
./mvnw spring-boot:run
```

The API starts at `http://localhost:8080/api`. Hibernate creates or updates the development schema, and the demo dataset is added idempotently at startup.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts at `http://localhost:5173` by default.

## Environment Variables

Copy the included `.env.example` files or export equivalent environment variables.

Backend:

| Variable | Purpose | Local default |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL JDBC URL | `jdbc:postgresql://localhost:5432/pulse` |
| `DATABASE_USERNAME` | Database username | `pulse` |
| `DATABASE_PASSWORD` | Database password | `pulse` |
| `JWT_SECRET` | JWT signing secret, minimum 32 characters | Development-only fallback |
| `OPENAI_API_KEY` | Enables live AI plan and insight generation | Empty; deterministic fallback used |
| `OPENAI_MODEL` | OpenAI model name | `gpt-4.1-mini` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:5173` |
| `PORT` | API port | `8080` |

Frontend:

| Variable | Purpose | Local default |
| --- | --- | --- |
| `VITE_API_URL` | Complete backend API base URL | `http://localhost:8080/api` |

Never commit real secrets. Activate the Spring `prod` profile with `SPRING_PROFILES_ACTIVE=prod` for deployment-oriented defaults.

## Demo Login

```text
Email:    adhiraj@example.com
Password: password123
```

The account includes coherent sample history for workouts, nutrition, water, sleep, measurements, goals, streaks, favourites, reminders, notifications and saved plans.

## Major Features

- Real-time health dashboard backed by persisted daily nutrition, hydration, workouts, body measurements and streak activity
- Server-aggregated Today timeline, deterministic health highlights, smart actions and three locally configurable pinned metrics
- Unified logging workspace for meals, workouts, water, sleep and body measurements
- Persisted goals and timelines derived from existing health records, including pace and evidence-based projections
- Workout logging, history, exercise details, filters and persistent favourites
- Food and meal logging with deterministic 0–100 meal-quality scoring
- Browser-camera EAN/UPC scanning with manual entry and Open Food Facts caching
- Profile-driven BMI, BMR, TDEE, calorie and macro targets
- Water quick-add, undo and seven-day trend
- Full sleep and body-measurement create, edit, delete, history and summary flows
- Weekly/monthly progress aggregation across workouts, nutrition, hydration, sleep and body data
- Persisted current and longest activity streaks
- Structured AI workout and meal plan generation with reliable credential-free fallbacks
- Saved plans and relational grocery lists with persistent checked state, custom items, editing, deletion, text export and print view
- Data-aware wellness insights with an explicit non-medical disclaimer
- Grounded Ask Circle answers, remaining-macro meal suggestions and a deterministic Finish My Day flow
- Week-over-week comparison, recovery score and workout personal records
- Light, dark and system appearance modes with no wrong-theme flash
- Configurable in-app reminders that create persistent due notifications, with read/unread controls
- Full user-data CSV export with profile, workout, nutrition, water, sleep and body sections

## External APIs

### OpenAI

When `OPENAI_API_KEY` is configured, the backend requests structured workout plans, meal plans and wellness insights. Responses are parsed into fixed DTOs. If the API is unavailable or no key is configured, high-quality deterministic generators keep every workflow demonstrable.

### Open Food Facts

Barcode lookup first checks PostgreSQL. Cache misses are requested from Open Food Facts, normalized per serving and stored locally. Lookup failures return a readable API error while manual food logging remains available.

## Important API Routes

- Dashboard and analytics: `GET /api/dashboard`, `GET /api/today`, `GET /api/progress`, `GET /api/progress/compare`, `GET /api/progress/recovery`, `GET /api/streak`
- Goals: `GET|POST /api/goals`, `GET|PUT|DELETE /api/goals/{id}` and goal lifecycle routes
- Workouts: `GET|POST /api/workouts`, `GET|DELETE /api/workouts/{id}`, `POST /api/workouts/{id}/repeat`, `GET /api/workouts/records`
- Exercises: `GET /api/exercises`, `PUT|DELETE /api/exercises/{id}/favourite`
- Nutrition: `GET|POST /api/meals`, `DELETE /api/meals/{id}`, `POST /api/nutrition/targets`
- Foods: `POST /api/foods`, `GET /api/foods/barcode/{barcode}`
- Health logs: `/api/water`, `/api/sleep`, `/api/measurements` and their summary endpoints
- Circle Health guidance: `POST /api/ai/insights`, `POST /api/ai/ask`, `GET /api/ai/meal-suggestions`, `GET /api/ai/finish-day`
- Saved plans: `/api/plans/workouts`, `/api/plans/meals`
- Grocery lists: `/api/grocery-lists`, `/api/grocery-items/{id}`
- Engagement: `/api/reminders`, `/api/notifications`
- Profile and export: `GET|PUT /api/profile`, `GET /api/profile/export`

## Running Tests

```bash
cd backend
./mvnw test
```

Tests cover nutrition calculations, structured and restriction-aware AI fallbacks, sleep/body/water service behavior, progress and calendar aggregation, goal mathematics and ownership, barcode caching and user-owned food isolation.

More detail is available in [User Guide](docs/USER_GUIDE.md), [Demo Guide](docs/DEMO_GUIDE.md), and [Architecture Guide](docs/ARCHITECTURE_GUIDE.md).

## Build Commands

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

Backend:

```bash
cd backend
./mvnw test
./mvnw package
```

The deployable backend artifact is generated under `backend/target/`, and the static frontend build is generated under `frontend/dist/`.
