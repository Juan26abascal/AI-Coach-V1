# OpenAI Chat (App API)

This project exposes a server-side endpoint that proxies chat requests to OpenAI and uses your OpenAI **Vector Store** for retrieval from your PDF knowledge base.

## Setup

1. Copy env template:

```bash
cp .env.example .env.local
```

2. Fill:

- `OPENAI_API_KEY`
- `OPENAI_VECTOR_STORE_ID`

Optional:
- `OPENAI_MODEL` (default: `gpt-4.1-mini`)

## API

### POST /api/chat

Body:
```json
{
  "message": "How should I train this week?",
  "history": [
    {"role":"user","content":"My goal is a sub-40 10k"},
    {"role":"assistant","content":"Great. How many days/week can you run?"}
  ]
}
```

Response:
```json
{
  "reply": "...",
  "meta": {"model":"gpt-4.1-mini"}
}
```

Notes:
- Uses OpenAI `file_search` tool with `OPENAI_VECTOR_STORE_ID`.
- Includes basic in-memory rate limiting (MVP). For production, switch to Redis/Upstash.

## Security
- Never commit `.env.local`
- Do not log prompts or API keys
- Rate limiting is enabled via env vars:
  - `CHAT_RATE_LIMIT_WINDOW_MS`
  - `CHAT_RATE_LIMIT_MAX`
  - `CHAT_MAX_INPUT_CHARS`
