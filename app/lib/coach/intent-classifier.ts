import type { ConversationMessage } from './types';

export enum Intent {
  SESSION_REQUEST = 'SESSION_REQUEST',
  SESSION_MODIFICATION = 'SESSION_MODIFICATION',
  SESSION_FEEDBACK = 'SESSION_FEEDBACK',
  PLAN_QUERY = 'PLAN_QUERY',
  PLAN_MODIFICATION = 'PLAN_MODIFICATION',
  INJURY_REPORT = 'INJURY_REPORT',
  INJURY_FOLLOWUP = 'INJURY_FOLLOWUP',
  PROGRESS_QUERY = 'PROGRESS_QUERY',
  KNOWLEDGE_QUERY = 'KNOWLEDGE_QUERY',
  MOTIVATION_ISSUE = 'MOTIVATION_ISSUE',
  GENERAL_CHAT = 'GENERAL_CHAT',
  COMPLIANCE_REPORT = 'COMPLIANCE_REPORT',
  SKIP_REPORT = 'SKIP_REPORT',
  CLARIFICATION = 'CLARIFICATION',
}

const translateLower = (text: string) => text.trim().toLowerCase();

const containsKeyword = (text: string, keywords: string[]) =>
  keywords.some((keyword) => text.includes(keyword));

const injuryKeywords = [
  'pain',
  'hurt',
  'injury',
  'sore',
  'ache',
  'twinge',
  'tight',
  'pulled',
  'strain',
  'swollen',
];
const sessionRequestKeywords = [
  'workout',
  'session',
  'today',
  'what should i do',
  "what's the plan",
];
const modificationKeywords = [
  'less',
  'more',
  'shorter',
  'longer',
  'easier',
  'harder',
  'instead',
  'change',
];
const planKeywords = ['week', 'plan', 'schedule', 'tomorrow', 'next'];
const feedbackKeywords = [
  'felt',
  'went',
  'was',
  'finished',
  'completed',
  'did it',
  'done',
];
const skipKeywords = [
  'skipped',
  'missed',
  "couldn't",
  "didn't run",
  "didn't do",
];
const complianceKeywords = ['did it', 'completed', 'done', 'finished'];
const motivationKeywords = [
  'tired',
  'unmotivated',
  "don't feel like",
  'struggling',
  'hard to',
];
const progressKeywords = ['progress', 'improve', 'how am i', 'how are', 'status'];
const knowledgeKeywords = [
  'how',
  'why',
  'what is',
  'what should',
  'explain',
  'tell me',
  'difference',
  'should i',
  'when should',
  'where should',
  'can i',
];

const askedInjuryQuestion = (history: ConversationMessage[]): boolean => {
  const lastAssistant = [...history]
    .reverse()
    .find((message) => message.role === 'assistant');

  if (!lastAssistant) {
    return false;
  }

  const text = translateLower(lastAssistant.content);
  const containsInjury =
    containsKeyword(text, injuryKeywords) || text.includes('injury');
  const isQuestion = text.includes('?') || text.startsWith('can you');

  return containsInjury && isQuestion;
};

export function classifyIntent(
  message: string,
  conversationHistory: ConversationMessage[],
): Intent {
  const normalized = translateLower(message);

  if (askedInjuryQuestion(conversationHistory)) {
    return Intent.INJURY_FOLLOWUP;
  }

  if (containsKeyword(normalized, injuryKeywords)) {
    return Intent.INJURY_REPORT;
  }

  if (containsKeyword(normalized, skipKeywords)) {
    return Intent.SKIP_REPORT;
  }

  if (containsKeyword(normalized, complianceKeywords)) {
    return Intent.COMPLIANCE_REPORT;
  }

  if (containsKeyword(normalized, feedbackKeywords)) {
    return Intent.SESSION_FEEDBACK;
  }

  const isSessionReference = containsKeyword(
    normalized,
    sessionRequestKeywords,
  );
  const isModificationReference = containsKeyword(
    normalized,
    modificationKeywords,
  );
  const isPlanReference = containsKeyword(normalized, planKeywords);

  if (isSessionReference && isModificationReference) {
    return Intent.SESSION_MODIFICATION;
  }

  if (isSessionReference) {
    return Intent.SESSION_REQUEST;
  }

  if (isPlanReference && isModificationReference) {
    return Intent.PLAN_MODIFICATION;
  }

  if (isPlanReference) {
    return Intent.PLAN_QUERY;
  }

  if (containsKeyword(normalized, progressKeywords)) {
    return Intent.PROGRESS_QUERY;
  }

  if (containsKeyword(normalized, motivationKeywords)) {
    return Intent.MOTIVATION_ISSUE;
  }

  if (
    containsKeyword(normalized, knowledgeKeywords) ||
    normalized.includes('?')
  ) {
    return Intent.KNOWLEDGE_QUERY;
  }

  if (normalized.includes('clarify') || normalized.includes('explain')) {
    return Intent.CLARIFICATION;
  }

  return Intent.GENERAL_CHAT;
}
