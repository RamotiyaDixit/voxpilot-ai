# VoxPilot AI

VoxPilot AI is a demo-first studio for designing AI voice agents, trying browser-based voice conversations, and reviewing simulated call transcripts and analytics.

> **Scope note:** This repository includes a working browser-speech demo and a provider-ready backend foundation. It does not provision telephony, a real-time speech-to-speech model, or phone numbers. Real calls require choosing and configuring a telephony/voice provider and completing the integration.

## Features

- **Agent studio:** Create agents with a name, purpose, greeting, voice style, and system instructions.
- **Voice playground:** Use browser speech recognition and speech synthesis when available; a text-based playground remains available in browsers without speech recognition.
- **Demo assistant responses:** Works without paid API credentials; optional OpenAI-compatible chat completions can be configured on the API server.
- **Call history:** Simulate calls, save transcripts, inspect outcomes and duration, and review a lightweight analytics overview.
- **REST API:** Health, agent CRUD, chat turn, demo call, call listing and detail endpoints.
- **MySQL schema and Docker Compose:** Local database service and initial schema.
- **TypeScript workspace and CI:** Separate Next.js web app and Express API with typecheck/build workflow.

## Stack

- Web: Next.js App Router, React, TypeScript, CSS
- API: Node.js, Express, TypeScript
- Data: MySQL 8
- Optional LLM: OpenAI-compatible Chat Completions API
- Browser voice: Web Speech API (browser-dependent)

## Quick start

Requirements: Node.js 20+ and npm.

```bash
git clone https://github.com/RamotiyaDixit/voxpilot-ai.git
cd voxpilot-ai
npm install
cp .env.example .env
npm run dev
```

Open the web dashboard at [http://localhost:3000](http://localhost:3000). The API runs at [http://localhost:4100](http://localhost:4100). The demo works without MySQL or an LLM key; the API uses in-memory demo data unless a database adapter is added/configured.

To start the local MySQL service:

```bash
docker compose up -d mysql
```

The included SQL schema is mounted into the MySQL initialization folder for a fresh volume. This starter currently uses in-memory repository storage so the UI is immediately runnable; connecting repository methods to MySQL is a clear next implementation step.

## Environment variables

| Variable | Description |
| --- | --- |
| `API_PORT` | API port; default `4100` |
| `WEB_ORIGIN` | Allowed browser origin for CORS |
| `DATABASE_URL` | Local MySQL connection string reserved for the database adapter |
| `AI_PROVIDER` | Provider label for the optional compatible LLM |
| `AI_BASE_URL` | OpenAI-compatible API base URL |
| `AI_API_KEY` | Server-side API key; never expose it via `NEXT_PUBLIC_*` |
| `AI_MODEL` | Chat model name |

## API overview

- `GET /health`
- `GET /api/agents`
- `POST /api/agents`
- `PATCH /api/agents/:id`
- `DELETE /api/agents/:id`
- `POST /api/chat/turn`
- `POST /api/calls/demo`
- `GET /api/calls`
- `GET /api/calls/:id`

All API responses are JSON. The server validates required user-provided fields and returns structured errors.

## Browser voice support

The voice playground uses `SpeechRecognition` / `webkitSpeechRecognition` for speech input and `speechSynthesis` for spoken replies where the browser supports them. Browser support and permission prompts vary. The text input is always available as a fallback. Browser voice is not the same as a production phone-call integration.

## Production checklist

Before using this with real customers or phone calls, add authentication and authorization, per-tenant data isolation, durable storage/migrations, rate limits, audit logs, request and transcript retention controls, consent and disclosure flows, provider webhook verification, telephony integration, observability, and deployment secret management. Treat transcripts as sensitive data. Validate provider URLs and outbound requests to prevent SSRF. Do not connect this starter directly to untrusted production traffic without these controls.

## Development

```bash
npm run dev
npm run typecheck
npm run build
```

## License

MIT
