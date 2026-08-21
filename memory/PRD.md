# TaskFlow – Správce úkolů pro týmovou spolupráci

## Original problem statement
Moderní webová aplikace pro řízení týmových úkolů: dashboard, list/cards/timeline, TipTap WYSIWYG, filtry, historie změn, administrace uživatelů/štítků/stavů, Material Design, responzivní, JWT + Google Auth.

## User personas
- Administrátor: plný přístup, správa uživatelů, číselníků, oprávnění
- Běžný uživatel: vytváření a úprava úkolů, filtry, timeline

## Architecture
- Backend: FastAPI + MongoDB (motor); JWT (httpOnly cookie + Bearer) + Emergent Google Auth
- Frontend: React 19 + React Router 7 + shadcn/ui + TailwindCSS + TipTap + sonner
- Data model: users, statuses, labels, tasks (label_ids/assignee_ids arrays for N:M), task_history, google_sessions

## Implemented (2026-08-21)
- Auth: register, login, logout, /me, Google session callback
- Dashboard: 5 KPI cards, recent tasks, breakdown by status/label
- Tasks: list/cards/timeline views, filters (status, label, assignee, due), sort (6 fields), global search
- Task detail sheet: full metadata, WYSIWYG-rendered description, historie změn
- TipTap editor: bold/italic/underline, headings, lists, quotes, alignment, tables, images, links, undo/redo
- Timeline: zoom Day/Week/Month/Year, status-colored pills, overdue red ring, today marker
- Administrace: users (role, active), labels (CRUD), statuses (CRUD, order, terminal flag)
- Profile page
- Material Design UI: Manrope + IBM Plex Sans, glassmorphic AppBar, collapsible drawer, chips, dialogs, snackbars
- Seed data: admin (hadrava.martin@gmail.com), 4 demo users, 5 statuses, 5 labels, 8 sample tasks

## Test credentials
See /app/memory/test_credentials.md

## Backlog (P1/P2)
- P1: E-mailové notifikace (přiřazení, blížící se termín)
- P1: Drag-and-drop reordering stavů v administraci
- P1: Kanban view (grouped by status)
- P2: In-app notifikace zvoneček s badge
- P2: Kalendářní pohled
- P2: Export úkolů (CSV/PDF)
- P2: Komentáře k úkolům
