/**
 * COACH v2.0 - Intent Classifier
 * 
 * Two-layer classification:
 * 1. Deterministic patterns (instant, free)
 * 2. AI fallback (only if needed)
 */

import { Intent, ClassificationResult, ConversationMessage } from './types';

// ============================================
// DETERMINISTIC PATTERNS
// ============================================

interface Pattern {
  regex: RegExp;
  intent: Intent;
  confidence: number;
}

const PATTERNS: Pattern[] = [
  // Greetings
  { regex: /^(hi|hello|hey|morning|afternoon|evening)[\s!.,]*$/i, intent: Intent.GREETING, confidence: 0.98 },
  { regex: /^(hi|hello|hey)\s+(coach|there)/i, intent: Intent.GREETING, confidence: 0.98 },
  { regex: /^good\s+(morning|afternoon|evening)/i, intent: Intent.GREETING, confidence: 0.98 },
  { regex: /^what'?s\s+up/i, intent: Intent.GREETING, confidence: 0.95 },
  
  // Gratitude
  { regex: /^(thanks|thank\s+you|thx|ty)[\s!.,]*$/i, intent: Intent.GRATITUDE, confidence: 0.98 },
  { regex: /appreciate\s+(it|that|you)/i, intent: Intent.GRATITUDE, confidence: 0.95 },
  { regex: /^(great|perfect|awesome),?\s*(thanks|thank)/i, intent: Intent.GRATITUDE, confidence: 0.95 },
  
  // Affirmation
  { regex: /^(got\s+it|okay|ok|sounds\s+good|will\s+do|perfect|great)[\s!.,]*$/i, intent: Intent.AFFIRMATION, confidence: 0.95 },
  { regex: /^(understood|roger|copy\s+that)/i, intent: Intent.AFFIRMATION, confidence: 0.95 },
  { regex: /^(yes|yeah|yep|yup|sure)[\s!.,]*$/i, intent: Intent.AFFIRMATION, confidence: 0.90 },
  
  // Farewell
  { regex: /^(bye|goodbye|see\s+you|later|cya)[\s!.,]*$/i, intent: Intent.FAREWELL, confidence: 0.98 },
  { regex: /^(talk|chat)\s+(later|soon|tomorrow)/i, intent: Intent.FAREWELL, confidence: 0.95 },
  { regex: /^(have\s+a\s+good|good)\s+(one|day|night|run|workout)/i, intent: Intent.FAREWELL, confidence: 0.90 },
  
  // Session Request
  { regex: /what('s|s|\s+is)\s+(my\s+)?(workout|session|training)\s*(today|now)?/i, intent: Intent.SESSION_REQUEST, confidence: 0.95 },
  { regex: /what\s+should\s+i\s+(do|run)\s*(today)?/i, intent: Intent.SESSION_REQUEST, confidence: 0.95 },
  { regex: /^(workout|session)\s*(please|\?)?$/i, intent: Intent.SESSION_REQUEST, confidence: 0.90 },
  { regex: /what('s|s)?\s*(on\s+)?(the\s+)?plan\s*(today|for\s+today)?/i, intent: Intent.SESSION_REQUEST, confidence: 0.90 },
  { regex: /ready\s+to\s+(run|train|workout)/i, intent: Intent.SESSION_REQUEST, confidence: 0.85 },
  
  // Session Modification
  { regex: /(can\s+we|let'?s)\s+(do\s+)?(less|shorter|easier|lighter)/i, intent: Intent.SESSION_MODIFICATION, confidence: 0.95 },
  { regex: /(too\s+much|too\s+hard|too\s+long)/i, intent: Intent.SESSION_MODIFICATION, confidence: 0.90 },
  { regex: /i\s+(only\s+)?have\s+(\d+)\s*(min|minutes|hour)/i, intent: Intent.SESSION_MODIFICATION, confidence: 0.95 },
  { regex: /(can'?t|cannot)\s+(do|handle)\s+(that|this|intervals)/i, intent: Intent.SESSION_MODIFICATION, confidence: 0.90 },
  { regex: /(make\s+it|something)\s+(easier|shorter|simpler)/i, intent: Intent.SESSION_MODIFICATION, confidence: 0.90 },
  
  // Check-in (workout logging)
  { regex: /(\d+\.?\d*)\s*(k|km|mi|miles?)\s*(in\s+)?(\d+)/i, intent: Intent.CHECK_IN, confidence: 0.95 },
  { regex: /(just\s+)?(did|ran|finished|completed)\s+(a\s+)?(\d+|my)/i, intent: Intent.CHECK_IN, confidence: 0.90 },
  { regex: /(done|finished)\s+(with\s+)?(the\s+)?(workout|run|session)/i, intent: Intent.CHECK_IN, confidence: 0.90 },
  { regex: /^(\d+)\s*(k|km|mi|miles?)/i, intent: Intent.CHECK_IN, confidence: 0.85 },
  
  // Skip Report
  { regex: /(didn'?t|did\s+not|couldn'?t|could\s+not)\s+(run|workout|train|do\s+it)/i, intent: Intent.SKIP_REPORT, confidence: 0.95 },
  { regex: /(skipped|missed)\s+(the\s+)?(workout|run|session|today)/i, intent: Intent.SKIP_REPORT, confidence: 0.95 },
  { regex: /took\s+(a\s+)?(rest|day\s+off)/i, intent: Intent.SKIP_REPORT, confidence: 0.90 },
  
  // Session Feedback
  { regex: /(felt|was)\s+(great|amazing|awesome|good|easy|hard|tough|terrible|bad)/i, intent: Intent.SESSION_FEEDBACK, confidence: 0.85 },
  { regex: /(nailed|crushed|smashed)\s+(it|the\s+workout)/i, intent: Intent.SESSION_FEEDBACK, confidence: 0.90 },
  { regex: /(struggled|suffered|died)\s+(through|out\s+there)/i, intent: Intent.SESSION_FEEDBACK, confidence: 0.90 },
  
  // Injury Report
  { regex: /(my\s+)?(knee|ankle|foot|shin|calf|hamstring|quad|hip|achilles|it\s*band)\s*(is\s+)?(hurt|pain|sore|aching)/i, intent: Intent.INJURY_REPORT, confidence: 0.95 },
  { regex: /(hurt|pain|injury|injured|sore|aching)\s*(in\s+)?(my\s+)?(knee|ankle|foot|leg|shin|calf)/i, intent: Intent.INJURY_REPORT, confidence: 0.95 },
  { regex: /something'?s\s+(wrong|off)\s+with\s+(my\s+)?/i, intent: Intent.INJURY_REPORT, confidence: 0.85 },
  { regex: /(sharp|shooting|throbbing)\s+pain/i, intent: Intent.INJURY_REPORT, confidence: 0.95 },
  
  // Fatigue Report
  { regex: /(i'?m\s+)?(really\s+)?(tired|exhausted|fatigued|worn\s+out|beat)/i, intent: Intent.FATIGUE_REPORT, confidence: 0.90 },
  { regex: /(legs?\s+(are|feel)\s+)(heavy|dead|shot|tired)/i, intent: Intent.FATIGUE_REPORT, confidence: 0.90 },
  { regex: /no\s+(energy|gas|juice)/i, intent: Intent.FATIGUE_REPORT, confidence: 0.85 },
  
  // Motivation Issue
  { regex: /(not\s+)?(feeling\s+)?(motivated|it|like\s+(running|training))/i, intent: Intent.MOTIVATION_ISSUE, confidence: 0.85 },
  { regex: /(losing|lost)\s+(my\s+)?motivation/i, intent: Intent.MOTIVATION_ISSUE, confidence: 0.95 },
  { regex: /(don'?t|do\s+not)\s+(want\s+to|feel\s+like)\s+(run|train)/i, intent: Intent.MOTIVATION_ISSUE, confidence: 0.90 },
  { regex: /(what'?s\s+the\s+point|why\s+bother)/i, intent: Intent.MOTIVATION_ISSUE, confidence: 0.90 },
  { regex: /training\s+(is\s+)?(a\s+)?grind/i, intent: Intent.MOTIVATION_ISSUE, confidence: 0.85 },
  
  // Anxiety Expression
  { regex: /(nervous|anxious|worried|scared|stressed)\s+(about|for)/i, intent: Intent.ANXIETY_EXPRESSION, confidence: 0.95 },
  { regex: /(don'?t\s+feel|not\s+feeling)\s+(ready|prepared)/i, intent: Intent.ANXIETY_EXPRESSION, confidence: 0.90 },
  { regex: /race\s+(is\s+)?(coming|soon|close)/i, intent: Intent.ANXIETY_EXPRESSION, confidence: 0.80 },
  { regex: /freaking\s+out/i, intent: Intent.ANXIETY_EXPRESSION, confidence: 0.95 },
  
  // Plan Query
  { regex: /what('s|s|\s+does)\s+(my\s+)?(week|schedule|plan)\s*(look\s+like)?/i, intent: Intent.PLAN_QUERY, confidence: 0.95 },
  { regex: /what('s|s)\s+(coming\s+up|planned|ahead)/i, intent: Intent.PLAN_QUERY, confidence: 0.90 },
  { regex: /(next|this)\s+(week|few\s+days)/i, intent: Intent.PLAN_QUERY, confidence: 0.85 },
  { regex: /show\s+(me\s+)?(the\s+)?plan/i, intent: Intent.PLAN_QUERY, confidence: 0.90 },
  
  // Progress Query
  { regex: /(am\s+i|how\s+am\s+i)\s+(on\s+)?track/i, intent: Intent.PROGRESS_QUERY, confidence: 0.95 },
  { regex: /how('s|s|\s+is)\s+(my\s+)?(progress|training\s+going)/i, intent: Intent.PROGRESS_QUERY, confidence: 0.95 },
  { regex: /(where\s+do\s+i|how\s+do\s+i)\s+stand/i, intent: Intent.PROGRESS_QUERY, confidence: 0.90 },
  
  // Knowledge Query
  { regex: /what\s+(is|are)\s+(threshold|tempo|easy|zones?|vo2|lactate)/i, intent: Intent.KNOWLEDGE_QUERY, confidence: 0.90 },
  { regex: /(how|why)\s+(do|does|should)\s+(i|we|it)/i, intent: Intent.KNOWLEDGE_QUERY, confidence: 0.70 },
  { regex: /explain\s+(to\s+me\s+)?/i, intent: Intent.KNOWLEDGE_QUERY, confidence: 0.85 },
  
  // Off Topic
  { regex: /(crossfit|hyrox|triathlon|cycling|swimming)\s*(training|workout)?/i, intent: Intent.OFF_TOPIC, confidence: 0.90 },
  { regex: /(should\s+i\s+take|recommend)\s+(creatine|protein|supplements?)/i, intent: Intent.OFF_TOPIC, confidence: 0.95 },
  { regex: /how\s+many\s+(grams|calories|carbs|protein)/i, intent: Intent.OFF_TOPIC, confidence: 0.90 },
];

// ============================================
// SENTIMENT DETECTION
// ============================================

const POSITIVE_WORDS = ['great', 'amazing', 'awesome', 'good', 'love', 'excited', 'happy', 'fantastic', 'perfect', 'nailed', 'crushed'];
const NEGATIVE_WORDS = ['bad', 'terrible', 'awful', 'hate', 'frustrated', 'angry', 'sad', 'worried', 'anxious', 'tired', 'exhausted', 'hurt', 'pain'];

function detectSentiment(message: string): 'positive' | 'neutral' | 'negative' {
  const lower = message.toLowerCase();
  const positiveCount = POSITIVE_WORDS.filter(w => lower.includes(w)).length;
  const negativeCount = NEGATIVE_WORDS.filter(w => lower.includes(w)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

// ============================================
// ENTITY EXTRACTION
// ============================================

function extractEntities(message: string): Record<string, string | number> {
  const entities: Record<string, string | number> = {};
  
  // Time/duration: "30 minutes", "1 hour"
  const timeMatch = message.match(/(\d+)\s*(min(?:ute)?s?|hours?|hr)/i);
  if (timeMatch) {
    entities.duration = parseInt(timeMatch[1]);
    entities.durationUnit = timeMatch[2].toLowerCase().startsWith('h') ? 'hours' : 'minutes';
  }
  
  // Distance: "5k", "10 miles"
  const distanceMatch = message.match(/(\d+\.?\d*)\s*(k|km|mi(?:les?)?)/i);
  if (distanceMatch) {
    entities.distance = parseFloat(distanceMatch[1]);
    entities.distanceUnit = distanceMatch[2].toLowerCase().startsWith('mi') ? 'miles' : 'km';
  }
  
  // Body part
  const bodyParts = ['knee', 'ankle', 'foot', 'shin', 'calf', 'hamstring', 'quad', 'hip', 'achilles', 'it band', 'back'];
  for (const part of bodyParts) {
    if (message.toLowerCase().includes(part)) {
      entities.bodyPart = part;
      break;
    }
  }
  
  // Pain level: "4 out of 10", "4/10"
  const painMatch = message.match(/(\d+)\s*(?:out\s+of|\/)\s*10/i);
  if (painMatch) {
    entities.painLevel = parseInt(painMatch[1]);
  }
  
  return entities;
}

// ============================================
// MAIN CLASSIFIER
// ============================================

export function classifyIntent(
  message: string,
  conversationHistory: ConversationMessage[] = []
): ClassificationResult {
  const trimmed = message.trim();
  
  // Handle empty message
  if (!trimmed) {
    return {
      intent: Intent.GENERAL_CHAT,
      confidence: 0.5,
      entities: {},
      sentiment: 'neutral',
    };
  }
  
  // Try deterministic patterns first
  for (const pattern of PATTERNS) {
    if (pattern.regex.test(trimmed)) {
      return {
        intent: pattern.intent,
        confidence: pattern.confidence,
        entities: extractEntities(trimmed),
        sentiment: detectSentiment(trimmed),
      };
    }
  }
  
  // Context-aware adjustments
  if (conversationHistory.length > 0) {
    const lastMessage = conversationHistory[conversationHistory.length - 1];
    
    // If coach just asked about injury, follow-up is likely injury-related
    if (lastMessage.role === 'assistant' && 
        (lastMessage.content.includes('pain level') || lastMessage.content.includes('hurt'))) {
      return {
        intent: Intent.INJURY_FOLLOWUP,
        confidence: 0.85,
        entities: extractEntities(trimmed),
        sentiment: detectSentiment(trimmed),
      };
    }
    
    // If coach just gave a workout, follow-up might be modification
    if (lastMessage.role === 'assistant' && lastMessage.content.includes('workout')) {
      const modWords = ['but', 'however', 'actually', 'instead', 'less', 'more', 'shorter', 'longer'];
      if (modWords.some(w => trimmed.toLowerCase().includes(w))) {
        return {
          intent: Intent.SESSION_MODIFICATION,
          confidence: 0.80,
          entities: extractEntities(trimmed),
          sentiment: detectSentiment(trimmed),
        };
      }
    }
  }
  
  // Default to general chat
  return {
    intent: Intent.GENERAL_CHAT,
    confidence: 0.5,
    entities: extractEntities(trimmed),
    sentiment: detectSentiment(trimmed),
  };
}

// ============================================
// INTENT METADATA
// ============================================

export const INTENT_METADATA: Record<Intent, {
  requiresAI: boolean;
  aiModel: 'none' | 'mini' | 'standard';
  maxTokens: number;
  canUseTemplate: boolean;
}> = {
  [Intent.GREETING]: { requiresAI: false, aiModel: 'none', maxTokens: 50, canUseTemplate: true },
  [Intent.GRATITUDE]: { requiresAI: false, aiModel: 'none', maxTokens: 50, canUseTemplate: true },
  [Intent.AFFIRMATION]: { requiresAI: false, aiModel: 'none', maxTokens: 50, canUseTemplate: true },
  [Intent.FAREWELL]: { requiresAI: false, aiModel: 'none', maxTokens: 50, canUseTemplate: true },
  
  [Intent.SESSION_REQUEST]: { requiresAI: true, aiModel: 'mini', maxTokens: 300, canUseTemplate: false },
  [Intent.SESSION_MODIFICATION]: { requiresAI: true, aiModel: 'mini', maxTokens: 300, canUseTemplate: false },
  [Intent.SESSION_FEEDBACK]: { requiresAI: true, aiModel: 'mini', maxTokens: 200, canUseTemplate: false },
  
  [Intent.CHECK_IN]: { requiresAI: true, aiModel: 'mini', maxTokens: 200, canUseTemplate: false },
  [Intent.COMPLIANCE_REPORT]: { requiresAI: true, aiModel: 'mini', maxTokens: 150, canUseTemplate: false },
  [Intent.SKIP_REPORT]: { requiresAI: true, aiModel: 'mini', maxTokens: 150, canUseTemplate: false },
  
  [Intent.PLAN_QUERY]: { requiresAI: true, aiModel: 'mini', maxTokens: 400, canUseTemplate: false },
  [Intent.PLAN_MODIFICATION]: { requiresAI: true, aiModel: 'standard', maxTokens: 400, canUseTemplate: false },
  
  [Intent.INJURY_REPORT]: { requiresAI: true, aiModel: 'standard', maxTokens: 300, canUseTemplate: false },
  [Intent.INJURY_FOLLOWUP]: { requiresAI: true, aiModel: 'standard', maxTokens: 300, canUseTemplate: false },
  [Intent.FATIGUE_REPORT]: { requiresAI: true, aiModel: 'mini', maxTokens: 200, canUseTemplate: false },
  
  [Intent.MOTIVATION_ISSUE]: { requiresAI: true, aiModel: 'standard', maxTokens: 250, canUseTemplate: false },
  [Intent.ANXIETY_EXPRESSION]: { requiresAI: true, aiModel: 'standard', maxTokens: 250, canUseTemplate: false },
  [Intent.FRUSTRATION_EXPRESSION]: { requiresAI: true, aiModel: 'standard', maxTokens: 250, canUseTemplate: false },
  
  [Intent.KNOWLEDGE_QUERY]: { requiresAI: true, aiModel: 'mini', maxTokens: 300, canUseTemplate: false },
  [Intent.PROGRESS_QUERY]: { requiresAI: true, aiModel: 'mini', maxTokens: 300, canUseTemplate: false },
  
  [Intent.GENERAL_CHAT]: { requiresAI: true, aiModel: 'mini', maxTokens: 200, canUseTemplate: false },
  [Intent.CONFUSION]: { requiresAI: true, aiModel: 'mini', maxTokens: 200, canUseTemplate: false },
  [Intent.OFF_TOPIC]: { requiresAI: false, aiModel: 'none', maxTokens: 100, canUseTemplate: true },
};