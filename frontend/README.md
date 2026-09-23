# AI Sana frontend

React + TypeScript frontend for the Django project in the sibling `../backend` directory.

## Run locally

1. From `../backend`, install dependencies with `python -m pip install -r ../requirements.txt`.
2. Set `SECRET_KEY` in the environment (required by Django settings) and run `python manage.py migrate` from `../backend`.
3. Start Django from `../backend`: `python manage.py runserver 127.0.0.1:8000`.
4. In this directory run `npm install`, then `npm run dev -- --host 127.0.0.1`.
5. Open the Vite URL printed in the terminal. Vite proxies `/api` and `/admin` to Django. Override the target with `DJANGO_URL`, or set `VITE_API_BASE_URL` when the API is hosted elsewhere.

The frontend consumes the existing Django routes: `GET/POST /api/tasks/`, `GET/PATCH /api/tasks/:id/`, `GET /api/tasks/:id/analysis/`, `POST /api/tasks/:id/publish/`, `GET /api/teams/`, and `GET/POST /api/proposals/` plus `POST /api/proposals/:id/decision/`.

## Architecture

- `src/domain/models.ts`: API-matching TypeScript contracts and small domain display models (`TaskModel`, `ProposalModel`). Django remains the scoring source of truth.
- `src/api/http.ts`: typed fetch client and API error handling.
- `src/api/services.ts`: `TaskApi`, `TeamApi`, and `ProposalApi` service classes.
- `src/app/App.tsx`: route-level screens and forms for catalog, task creation/editing, team listing, proposals, and manual business decisions.
- `src/styles.css`: responsive presentation.

The UI supports a persisted light/dark theme, priority-level and industry filters in the catalog, sorting by industry, proposal badges, and an on-site team creation form. Each catalog card links directly to the proposal form. The task editor shows clarification questions in the score sidebar in place of the improvement list. The footer is pinned to the bottom on short pages.

The existing backend does not expose separate clarification-answer, authentication, or recommendation endpoints. Questions come from task analysis; the business form edits the actual Django task fields and persists with PATCH. Teams can be created from the site using the backend's `POST /api/teams/` route. Proposal decisions accept `accepted` or `rejected`; the initial state is `pending`.

## Notes

- API fields and levels follow `tasks_app/views.py` and `tasks_app/services/scoring.py` as implemented.
- The Django settings shown in the provided backend do not configure CORS. The included Vite proxy keeps browser API requests same-origin during development.
- This is a demo MVP; no authentication or role enforcement exists in the provided backend.
