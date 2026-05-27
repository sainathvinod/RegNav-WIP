# RegNav Frontend

React 19 + TypeScript SPA for RegNav.AI, built with Vite.

## Prerequisites

- Node.js 20+
- npm 10+ (or pnpm)

## Setup

```bash
cp .env.example .env.local
# edit .env.local to point VITE_API_BASE_URL at your backend
npm install
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server on http://localhost:3000 |
| `npm run build` | Type-check and produce a production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | Run TypeScript in noEmit mode |
| `npm run lint` | Lint the `src/` tree (zero warnings allowed) |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |

## Environment

The dev server proxies `/api/*` to `VITE_API_BASE_URL` (defaults to
`http://localhost:8000`, where the FastAPI backend listens). Never commit
real secrets to `.env` files — production values are injected by the
hosting platform.

## Project layout

```
src/
├── components/   # Reusable UI building blocks
├── pages/        # Route-level views
├── services/     # API clients (LLM, backend)
├── store/        # Zustand stores
├── types/        # Shared TypeScript types
├── utils/        # Helpers
├── data/         # Static seed data
└── main.tsx      # Vite entry point
```
