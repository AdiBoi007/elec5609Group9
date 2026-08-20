# Circle Health Demonstration Guide

## Demo account

```text
adhiraj@example.com
password123
```

## Recommended five-minute walkthrough

1. Open **Dashboard**. Point out the persisted metric strip, daily score, smart next action, chronological Today timeline, health highlights, pinned metrics and active goals.
2. Press **Cmd/Ctrl+K**, enter `250ml water`, and submit. Refresh Dashboard to demonstrate persistence and shared totals.
3. Open **Log → Meal**. Add a recent food, adjust its quantity and show live macro totals. The barcode flow distinguishes grams, millilitres and serving-based products.
4. Open **Workouts**. Show compact session volume, Personal Records, the exercise drawer, embedded video fallback and persistent favourites. Open a session and use **Repeat workout**.
5. Open **Progress**. Change week/month, inspect comparison and recovery, then select a calendar date to explain why it was on track or needed attention.
6. Open **Goals**. Show an active goal’s derived current value, progress, pace and projection. Create a short demonstration goal if desired.
7. Open **Ask Circle** and ask “Am I on track for my weight goal?” Then show meal suggestions and Finish My Day.
8. Open **Settings → Appearance** and switch Light, Dark and System. Finish with the CSV export under Data.

## External-service fallback

Leave `OPENAI_API_KEY` unset to demonstrate that insights and generated plans remain functional. If camera access is unavailable, use manual barcode entry. Open Food Facts errors never block custom food entry.

## Key integrity points

- Sleep belongs to the date on which the user wakes.
- Calendar, Dashboard, Nutrition and Log totals share persisted data.
- Body measurements do not reduce daily adherence scores.
- Absence of an unscheduled workout is neutral.
- Goal projections are labelled estimates and require sufficient history.
