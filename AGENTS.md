# WormGPT - Agent Notes

## Layout

- `apps/web`  - Next.js 15 + React 19 frontend
- `apps/api`  - FastAPI backend (Python 3.13)
- `packages/shared` - Cross-app types/utilities (TS, optional)
- `infra/docker` - Dockerfiles, docker-compose, Nginx
- `infra/ci` - CI templates
- `.github/workflows` - GitHub Actions
- `scripts` - One-off scripts (seed etc.)
- `docs` - Architecture / runbooks

## Commands

| Task            | Command                            |
|-----------------|------------------------------------|
| Dev (both)      | `npm run dev`                      |
| Dev API only    | `npm run dev:api`                  |
| Dev Web only    | `npm run dev:web`                  |
| Typecheck       | `npm run typecheck`                |
| Lint            | `npm run lint`                     |
| Seed            | `npm run seed`                     |
| Docker up       | `npm run docker:up`                |

## Conventions

- Frontend: TypeScript strict, App Router, route groups in parens.
- Backend: Python 3.13, type hints everywhere, async-first, Pydantic v2.
- All env via `.env` (root) or service-local `.env`. Never commit secrets.
- API keys: encrypted at rest with Fernet, never serialized to the client.
- System prompts: never serialized to non-admin users.
- All chat completions flow through `BaseProvider` so swapping vendors is config-only.

## Verification hooks

- Backend: `python -c "import apps.api.app.main"` should not fail at import (after `pip install`).
- Frontend: `npm run typecheck` from repo root should exit 0.
