---
title: WormGPT
emoji: 🧠
colorFrom: gray
colorTo: blue
sdk: docker
pinned: false
---

# WormGPT

> Production-grade AI chat platform. Streaming chat, multi-source research, collaborative canvases, full developer panel, admin approval workflow, and a polished UI.

- **Frontend:** Next.js 15, React 19, TypeScript, TailwindCSS, ShadCN primitives, Framer Motion, Zustand, React Query.
- **Backend:** FastAPI, Python 3.13, async-first, Pydantic v2.
- **Storage:** MongoDB Atlas (with Realm interpreted as Atlas App Services — see *Architecture notes* below).
- **Cache:** Redis.
- **AI providers:** Groq (real, primary), OpenAI / Anthropic / Gemini / DeepSeek / Qwen / Ollama (stubs ready; flip a key and they go live).
- **Infra:** Docker, Docker Compose, Nginx, Let's Encrypt via certbot, GitHub Actions CI.

## Layout

```
.
├── apps/
│   ├── web/           Next.js 15 frontend
│   └── api/           FastAPI backend (Python 3.13)
├── packages/
│   └── shared/        (optional) cross-app types
├── infra/
│   ├── docker/        Dockerfiles, docker-compose, Nginx
│   └── ci/            CI templates
├── .github/workflows  GitHub Actions
├── scripts/           One-off scripts (seed etc.)
└── docs/              Architecture / runbooks
```

## Quick start (local)

### 1. Configure environment

```bash
cp .env.example .env
# Edit .env: set MONGO_URI, JWT_SECRET, ENCRYPTION_KEY, GROQ_API_KEY
```

Generate secrets:

```bash
python -c "import secrets; print('JWT_SECRET=' + secrets.token_urlsafe(64))"
python -c "from cryptography.fernet import Fernet; print('ENCRYPTION_KEY=' + Fernet.generate_key().decode())"
```

### 2. Start infrastructure (Mongo + Redis)

Easiest path is the bundled compose stack:

```bash
npm run docker:up
```

This brings up Mongo, Redis, the API, the web app, Nginx, and certbot.

### 3. Run the dev servers (without Docker)

```bash
# Terminal 1: API on :8000
npm run dev:api

# Terminal 2: Web on :3000
npm run dev:web
```

Open http://localhost:3000. The first time, the backend creates a bootstrap superadmin from `BOOTSTRAP_*` in `.env`. Sign in with it and head to the **Admin** area to approve new users.

### 4. Seed sample data (optional)

```bash
npm run seed
# seeds: demo@wormgpt.local / Demo123!  +  "WormGPT Default" system prompt
```

## Default ports

| Service        | Port |
|----------------|------|
| Web (Next.js)  | 3000 |
| API (FastAPI)  | 8000 |
| Mongo          | 27017 |
| Redis          | 6379 |
| Nginx          | 80 / 443 |

## Adding providers

1. Sign in as admin and visit `/developer`.
2. Click **New model** and pick a provider, enter name + API key, and save.
3. The model appears in the top-bar selector immediately. Click **Test** to ping it.
4. Only admins see disabled models or reveal API keys.

## Architecture notes

### "Realm"

The spec mentions "Realm Database / Realm Sync / Realm Authentication". Realm is a mobile-first sync SDK (React Native / iOS / Android) and has no first-party Python sync SDK. We map that to **MongoDB Atlas App Services** (the renamed MongoDB Realm) and use MongoDB Atlas as the primary store. Auth lives in FastAPI with JWT + refresh tokens.

### Security

- Passwords hashed with bcrypt.
- API keys encrypted at rest with Fernet.
- System prompts never sent to non-admin users.
- JWT with refresh tokens, CSRF token on cookies for non-GET requests, CSP headers, rate limiting, account lockout after 8 failed logins, audit log for every privileged action, device fingerprinting.

### Streaming

Chat uses Server-Sent Events. The browser's `fetch` + `ReadableStream` is used (instead of `EventSource`) so we can send the auth header in the request. The server emits `start`, `delta`, `finish`, `error`, and `done` events. The final `done` event contains the assistant message id and timing metadata.

### Provider abstraction

All chat completions go through `BaseProvider`. Implementations live in `apps/api/app/providers/`. Add a new one by subclassing `BaseProvider` and registering it in `get_provider()`.

## License

Proprietary. © WormGPT.
