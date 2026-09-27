# WorkSphere – AI Employee Performance & Analytics Platform

## Problem statement and objectives

Teams often manage projects, communication, employee data, and performance signals in separate places. WorkSphere combines the existing project workspace with an employee performance area so managers can maintain profiles, compare consistent metrics, review historical trends, and ask data-grounded questions. The goal is to support useful check-ins, not automate employment decisions.

## Features

- Protected dashboard, employee directory, employee details, analytics, and AI Assistant pages
- Create, view, edit, search, filter, sort, paginate, and delete employee profiles
- Five 0–100 performance metrics with a score calculated from the data
- Monthly employee history, performance comparisons, department summaries, scatter and trend charts
- AI insights on employee detail pages, plus a workspace question-answer assistant
- OpenAI service is configured on the backend only; deterministic local analytics responses keep the product useful without an API key
- Loading/error/empty states, form constraints, delete confirmation, responsive layout, and light/dark theme support
- Existing WorkSphere projects, tasks, teams, documents, messages, notifications, and authentication remain available

## Technology and architecture

- Frontend: React 19, TypeScript, Vite, React Router, Recharts, Lucide icons
- Backend: Node.js, Express, JWT, bcryptjs
- Database: MySQL using the existing WorkSphere database and schema; employee performance uses its own `employees` table
- AI: optional OpenAI Chat Completions API called by the backend; private keys are never sent to the browser

The frontend sends authenticated requests to the Express API. Employee APIs validate inputs before MySQL writes. MySQL calculates the generated `performance_score` column. The API derives analytics from employee rows and monthly JSON histories. For AI answers, the backend calculates aggregate statistics first and gives the assistant structured records with instructions to use only those facts. If OpenAI is not configured or does not respond, a local rule-based answer is returned.

## Performance calculation and data model

All five input metrics use the same 0–100 range and have equal weight:

`performanceScore = attendance × 0.20 + productivity × 0.20 + taskCompletion × 0.20 + qualityScore × 0.20 + teamworkScore × 0.20`

MySQL stores the result as a generated column, so clients cannot submit a conflicting overall score. Each employee also has a unique employee ID and email, department, position, joining date, status, monthly history, and created/updated timestamps. Monthly history records each metric by reporting month.

Employee profiles belong to the account that created them. New accounts start with an empty employee list; employee CRUD, analytics, and AI endpoints filter by the authenticated JWT user ID. The schema migration removes the earlier shared fictional seed set. To load demo profiles for one account, set `DEMO_OWNER_USER_ID` to that user's ID and run `npm run seed:employees --prefix backend`. This loads 15 fictional profiles visible only to that account.

## Folder structure

```text
src/
  components/layout/       shared navigation and performance layout
  lib/performanceApi.ts    authenticated API client and data types
  pages/AI/                WorkSphere AI Assistant
  pages/Analytics/         filters and organization charts
  pages/Dashboard/         performance summary and charts
  pages/Employees/         directory, profile, CRUD, insights, styles
  routes/                  React Router and protected routes
backend/
  db.js                    MySQL connection
  performance.js           schema initialization, REST, analytics, AI
  performanceData.js       fictional demo data and seed helper
  seedEmployees.js         optional employee seed command
  seedAdmin.js             optional initial admin account command
```

## Install and run

1. Install frontend dependencies: `npm install`.
2. Copy `backend/.env.example` to `backend/.env`. Set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and a long random `JWT_SECRET`.
3. Create the MySQL database configured by `DB_NAME`.
4. Start the API: `npm run dev --prefix backend`.
5. Start Vite in a second terminal: `npm run dev`.
6. Open `http://localhost:5173` and sign in using an existing WorkSphere account.

The API defaults to `http://localhost:5000/api`. If needed, create a frontend `.env` with `VITE_API_URL=http://localhost:5000/api`. The backend creates and migrates the employee table at startup but does not insert demo employees automatically.

## Deployment (Vercel + Render)

The repository includes `vercel.json` for client-side route refreshes and `render.yaml` for the Express API service. Deploy the frontend as a Vercel Vite project from the repository root (`npm run build`, output directory `dist`). Set the Vercel environment variable `VITE_API_URL` to the Render API URL ending in `/api`, for example `https://worksphere-api.onrender.com/api`, for both Production and Preview as needed.

Deploy the Render service from the Blueprint in `render.yaml`. It builds from `backend/`, runs `npm ci` and `npm start`, and checks `/health`. Set `CORS_ORIGINS` to the exact Vercel site origin (no trailing slash); include a comma-separated list only when additional origins are intentionally allowed. Render generates `JWT_SECRET` for the service.

The backend requires a MySQL-compatible database reachable from Render. The local MySQL server at `localhost` cannot be used by the deployed service. The included Blueprint provisions only the free Render API service; it does not provision a paid database. For a free hosted database, create a TiDB Cloud Starter instance, then set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` from TiDB's Connect panel in the Render service environment and set `DB_SSL=true`. TiDB Cloud Starter currently provides a free monthly quota; if exceeded, it throttles connections rather than automatically charging when the spending limit remains zero. The app does not copy local accounts or records to the hosted database; export/import data only if you intend to publish it to that deployment.

Uploaded documents and message attachments are written to disk. Render's default service filesystem is ephemeral; for durable uploads, attach a persistent disk to the API service, mount it at `/var/data`, and set `UPLOADS_DIR=/var/data`. Do not put database or OpenAI secrets in Vercel; `OPENAI_API_KEY` belongs only in Render's backend environment. `OPENAI_API_KEY` is optional because the assistant has a local analytics fallback.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `PORT` | Express port (default `5000`) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL-compatible database connection |
| `DB_SSL` | Enable TLS for hosted database connections such as TiDB Cloud Starter |
| `JWT_SECRET` | JWT signing and verification secret |
| `OPENAI_API_KEY` | Optional backend-only AI provider key |
| `OPENAI_MODEL` | Optional model name (default `gpt-4o-mini`) |
| `DEMO_ADMIN_NAME`, `DEMO_ADMIN_EMAIL`, `DEMO_ADMIN_PASSWORD` | Optional environment-driven seed-admin account |
| `DEMO_OWNER_USER_ID` | Account ID that owns optional demo employee seed records |
| `VITE_API_URL` | Optional frontend API base URL |

Never commit `.env` files or real credentials. The admin seeder requires the three `DEMO_ADMIN_*` values and does not overwrite an existing user or password. There is no hard-coded demo password; use the configured credentials or an existing WorkSphere login.

## API endpoints

All employee, analytics, and AI routes below require the existing JWT bearer token.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/employees?search=&department=` | Search/filter employee list |
| `GET` | `/api/employees/:id` | Employee profile and monthly history |
| `POST` | `/api/employees` | Create employee |
| `PUT` | `/api/employees/:id` | Update employee |
| `DELETE` | `/api/employees/:id` | Delete employee |
| `GET` | `/api/analytics/overview?department=&employeeId=` | KPIs, rankings, monthly and department data |
| `GET` | `/api/analytics/department` | Department averages |
| `GET` | `/api/analytics/monthly` | Monthly averages |
| `POST` | `/api/ai/chat` | Ask a question about current employee analytics |
| `POST` | `/api/ai/insights` | Generate profile insights from one employee’s metrics/history |

## AI behavior and responsible use

The API key remains in the server environment. The AI is instructed to use supplied employee analytics only, avoid invented statistics, and frame results as coaching signals. Local fallback answers cover the common demo questions (top performers, department averages, declining trends, attendance, productivity, and employee summaries). OpenAI requests include structured performance records, which may contain employee names and metrics; configure the provider only if your organization permits this data transfer. Review records and context with employees before acting on an insight.

## Verification

`npm run build` compiles TypeScript and creates the Vite production bundle. The implemented API was also exercised against the configured local database for employee listing, analytics summary, local AI fallback, and a create/update/delete cycle.

## Future enhancements

- Role-based manager/admin access and department-scoped permissions
- Editable monthly metric history and configurable metric weights
- CSV import/export, audit history, and pagination at the API layer
- More explainable forecasting and configurable review periods
- Notification workflows for employee check-ins and review cycles

## Automatic task progress signals

The task page derives a progress signal from each task’s saved workflow status and due date: completed, overdue, due soon, on schedule, or missing a due date. This flags schedule risk without pretending the app can see whether someone began work. The current task schema has no employee assignment or task activity history, so actual work status must still be reported in the workflow status control until those signals are added.
