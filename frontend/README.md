# Iske frontend

React + TypeScript frontend for the Django project in `C:\Users\user\Desktop\backend`.

## Run locally

1. Install the backend Python dependencies if needed: `python -m pip install Django python-dotenv`.
2. Set `SECRET_KEY` in the environment (required by the supplied settings) and run `python manage.py migrate` from the backend directory. The initial `tasks_app` migration is included in the backend.
3. Start Django from the backend directory: `python manage.py runserver 127.0.0.1:8000`.
4. In this directory run `npm install`, then `npm run dev -- --host 127.0.0.1`.
5. Open the Vite URL printed in the terminal. Vite proxies `/api` and `/admin` to Django. Override the target with `DJANGO_URL`, or set `VITE_API_BASE_URL` when the API is hosted elsewhere.

The frontend consumes the existing Django routes: `GET/POST /api/tasks/`, `GET/PATCH /api/tasks/:id/`, `GET /api/tasks/:id/analysis/`, `POST /api/tasks/:id/publish/`, `GET /api/teams/`, and `GET/POST /api/proposals/` plus `POST /api/proposals/:id/decision/`.

## Architecture

- `src/domain/models.ts`: API-matching TypeScript contracts and small domain display models (`TaskModel`, `ProposalModel`). Django remains the scoring source of truth.
- `src/api/http.ts`: typed fetch client and API error handling.
- `src/api/services.ts`: `TaskApi`, `TeamApi`, and `ProposalApi` service classes.
- `src/app/App.tsx`: route-level screens and forms for catalog, task creation/editing, team listing, proposals, and manual business decisions.
- `src/styles.css`: responsive presentation.

The existing backend does not expose separate clarification-answer, authentication, or recommendation endpoints. Questions come from task analysis; the business form edits the actual Django task fields and persists with PATCH. Teams must already exist (create seed records or use Django admin). Proposal decisions accept `accepted` or `rejected`; the initial state is `pending`.

## Notes

- API fields and levels follow `tasks_app/views.py` and `tasks_app/services/scoring.py` as implemented.
- The Django settings shown in the provided backend do not configure CORS. The included Vite proxy keeps browser API requests same-origin during development.
- This is a demo MVP; no authentication or role enforcement exists in the provided backend.
