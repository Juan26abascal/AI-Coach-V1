<<<<<<< HEAD
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
=======
type FileSearchTool = {
  type: 'file_search';
  vector_store_ids: string[];
  max_num_results?: number;
};

export const VECTOR_STORE_ID = process.env.OPENAI_VECTOR_STORE_ID ?? '';

export function buildFileSearchTool(vectorStoreId = VECTOR_STORE_ID): FileSearchTool | null {
  if (!vectorStoreId) return null;
  return {
    type: 'file_search',
    vector_store_ids: [vectorStoreId],
    max_num_results: 4,
  };
}

export function hasFileSearchResults(response: unknown): boolean {
  if (!response || typeof response !== 'object') return false;
  const output = (response as { output?: unknown }).output;
  if (!Array.isArray(output)) return false;
  return output.some((item) => {
    if (!item || typeof item !== 'object') return false;
    const type = (item as { type?: string }).type ?? '';
    if (type.toLowerCase().includes('file_search')) return true;
    const name = (item as { name?: string }).name ?? '';
    if (name.toLowerCase().includes('file_search')) return true;
    const tool = (item as { tool?: { type?: string } }).tool;
    return tool?.type === 'file_search';
  });
}
>>>>>>> origin/main
