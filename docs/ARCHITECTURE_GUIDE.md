# Circle Health Architecture Guide

## System shape

Circle Health is intentionally a single React application backed by one Spring Boot service and PostgreSQL database. External APIs enhance the monolith but are not required for a successful demo.

```text
React + TypeScript
       │ JWT JSON REST
Spring Boot controllers
       │
DTO validation → services → JPA repositories → PostgreSQL
                       ├── OpenAI (optional)
                       └── Open Food Facts (optional)
```

## Backend layers

- `controller`: authenticated REST routes; user IDs are not accepted from clients.
- `dto`: request validation and stable response shapes.
- `service`: calculations, ownership checks, aggregation and external fallbacks.
- `repository`: Spring Data queries constrained by the authenticated user where applicable.
- `entity`: relational persistence, including cascade/orphan rules for owned children.
- `security` and `config`: existing JWT filter chain, CORS and environment configuration.

The Today, Dashboard, Progress, Calendar, Streak and Goals services reuse the same persisted meal, water, sleep, workout and measurement records. Goal timelines store goal metadata only; current values and progress are derived on read.

## Frontend structure

- `pages`: route-level product surfaces, lazy-loaded from `App.tsx`.
- `components`: shared cards, drawers, command palette, calendar and feature controls.
- `services/api.ts`: one typed API boundary and consistent error handling.
- `context`: authentication and theme providers.
- `types.ts`: shared frontend response contracts.

Theme mode is represented by `light | dark | system`. A pre-render script applies the saved/system choice before React mounts, while Tailwind semantic colour tokens keep components consistent.

## Deterministic calculations

- Nutrition targets: standard Mifflin–St Jeor BMR with profile activity and goal adjustments.
- Calendar: only applicable logged categories contribute; body is informational and workout absence is neutral.
- Goals: directional progress is clamped to 0–100; body projections use recorded pace and disappear when the trend is insufficient or moving away from target.
- Recovery and Ask Circle fallbacks: transparent combinations of persisted sleep, hydration, training and nutrition data with non-medical disclaimers.

## Deployment configuration

The frontend uses `VITE_API_URL`. The backend uses `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `JWT_SECRET`, `CORS_ORIGIN`, `OPENAI_API_KEY`, `OPENAI_MODEL` and `PORT`. No secrets are committed. See the root README for exact commands.
