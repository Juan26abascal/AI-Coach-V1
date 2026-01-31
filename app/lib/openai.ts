import 'server-only';
import OpenAI from 'openai';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export function getOpenAIClient() {
  // Correct: pass the ENV VAR NAME, not the secret itself
  const apiKey = requiredEnv('OPENAI_API_KEY');

  const organization = process.env.OPENAI_ORG_ID;
  const project = process.env.OPENAI_PROJECT_ID;

  return new OpenAI({ apiKey, organization, project });
}

export function getVectorStoreId() {
  // Correct: pass the ENV VAR NAME, not the "vs_..." value
  return requiredEnv('OPENAI_VECTOR_STORE_ID');
}

export function getModel() {
  return process.env.OPENAI_MODEL || 'gpt-4.1-mini';
}

export function getChatLimits() {
  const windowMs = Number(process.env.CHAT_RATE_LIMIT_WINDOW_MS ?? 60_000);
  const max = Number(process.env.CHAT_RATE_LIMIT_MAX ?? 20);
  const maxChars = Number(process.env.CHAT_MAX_INPUT_CHARS ?? 4000);
  return {
    windowMs: Number.isFinite(windowMs) ? windowMs : 60_000,
    max: Number.isFinite(max) ? max : 20,
    maxChars: Number.isFinite(maxChars) ? maxChars : 4000,
  };
}
