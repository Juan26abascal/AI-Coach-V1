# AI Coach (V1)

Premium AI running coach with a chat-first experience. Built with Next.js, TypeScript, and OpenAI.

## Overview
COACH is an AI-powered running coach that makes decisive training recommendations based on your current state, training history, and goals.

Core philosophy: **The coach decides. The athlete executes.**

## Tech Stack
- Frontend: Next.js (App Router), React, TypeScript, Tailwind
- State: Zustand
- AI: OpenAI (Responses API) + Vector Store (RAG/file_search)
- Backend: Next.js API Routes

## Running locally
1. Install dependencies:
   ```bash
   npm install
   ```
2. Set environment variables in `.env.local`:
   ```bash
   OPENAI_API_KEY=your_api_key
   OPENAI_VECTOR_STORE_ID=your_vector_store_id
   OPENAI_MODEL=gpt-4.1-mini
   ```
3. Start:
   ```bash
   npm run dev
   ```
4. Visit `http://localhost:3000`.

## Notes
- Keep secrets out of git. `.env*` files are ignored.
- The `/api/coach` route enables `file_search` with your Vector Store and caps retrieval to 4 chunks/request.
