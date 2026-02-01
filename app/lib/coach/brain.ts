/**
 * COACH v2.0 - Brain
 * 
 * The main orchestrator that:
 * 1. Classifies intent
 * 2. Builds context
 * 3. Routes to appropriate handler
 * 4. Returns response
 */

import OpenAI from 'openai';
import { classifyIntent, INTENT_METADATA } from './intent-classifier';
import { COACH_SYSTEM_PROMPT } from './system-prompt';
import { CoachResponseSchema, type CoachResponse, parseCoachResponse } from './schema';
import { 
  Intent, 
  type ConversationMessage, 
  type CoachMemory,
  type MemoryContext,
  type HandlerContext,
  type HandlerResult 
} from './types';

// ============================================
// OPENAI CLIENT
// ============================================

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================
// TEMPLATE RESPONSES (No AI needed)
// ============================================

const GREETING_RESPONSES = [
  "Hey! Ready to train?",
  "Good to see you. What's on your mind?",
  "Hey! How are you feeling today?",
  "Hi! Let's make today count.",
];

const GRATITUDE_RESPONSES = [
  "You got it.",
  "Anytime.",
  "That's what I'm here for.",
];

const AFFIRMATION_RESPONSES = [
  "Good. Let's do it.",
  "Perfect.",
  "Let's go.",
];

const FAREWELL_RESPONSES = [
  "Good luck out there.",
  "Talk soon. Run well.",
  "See you next time.",
];

const OFF_TOPIC_RESPONSES = [
  "That's outside my expertise—I coach running specifically.",
  "I focus on running. For that, you'd want to consult someone else.",
];

function getTemplateResponse(intent: Intent): string {
  const templates: Record<string, string[]> = {
    [Intent.GREETING]: GREETING_RESPONSES,
    [Intent.GRATITUDE]: GRATITUDE_RESPONSES,
    [Intent.AFFIRMATION]: AFFIRMATION_RESPONSES,
    [Intent.FAREWELL]: FAREWELL_RESPONSES,
    [Intent.OFF_TOPIC]: OFF_TOPIC_RESPONSES,
  };
  
  const options = templates[intent];
  if (!options) return "I'm here to help with your running.";
  
  return options[Math.floor(Math.random() * options.length)];
}

// ============================================
// MEMORY CONTEXT BUILDER
// ============================================

function buildMemoryContext(memory: CoachMemory, intent: Intent): MemoryContext {
  const context: MemoryContext = {
    athlete: memory.core.name,
  };
  
  // Add context based on intent
  switch (intent) {
    case Intent.SESSION_REQUEST:
    case Intent.SESSION_MODIFICATION:
      context.goal = memory.core.goal;
      context.fitness = `AC ratio: ${memory.metrics.fitness.acRatio.toFixed(2)}`;
      context.today = memory.session.todayPlan;
      if (memory.threads.injuries.length > 0) {
        const active = memory.threads.injuries.find(i => i.status === 'active');
        if (active) context.injury = `Active: ${active.area} (severity ${active.severity})`;
      }
      break;
      
    case Intent.INJURY_REPORT:
    case Intent.INJURY_FOLLOWUP:
      context.injury = memory.threads.injuries
        .map(i => `${i.area}: ${i.status}`)
        .join(', ') || 'None reported';
      context.recent = memory.session.recentWorkouts
        .slice(0, 3)
        .map(w => `${w.type}: ${w.status}`)
        .join(', ');
      break;
      
    case Intent.CHECK_IN:
    case Intent.COMPLIANCE_REPORT:
      context.today = memory.session.todayPlan;
      context.recent = memory.session.recentWorkouts
        .slice(0, 3)
        .map(w => `${w.type}: ${w.status}`)
        .join(', ');
      break;
      
    case Intent.MOTIVATION_ISSUE:
    case Intent.ANXIETY_EXPRESSION:
    case Intent.FRUSTRATION_EXPRESSION:
      context.pattern = memory.patterns.communicationStyle;
      context.recent = memory.session.conversationHighlights.slice(0, 2).join('; ');
      break;
      
    default:
      // Minimal context for other intents
      break;
  }
  
  return context;
}

function formatContextForPrompt(context: MemoryContext): string {
  const lines: string[] = [];
  
  if (context.athlete) lines.push(`ATHLETE: ${context.athlete}`);
  if (context.goal) lines.push(`GOAL: ${context.goal}`);
  if (context.fitness) lines.push(`FITNESS: ${context.fitness}`);
  if (context.today) lines.push(`TODAY: ${context.today}`);
  if (context.injury) lines.push(`INJURY: ${context.injury}`);
  if (context.pattern) lines.push(`PATTERN: ${context.pattern}`);
  if (context.recent) lines.push(`RECENT: ${context.recent}`);
  
  return lines.join('\n');
}

// ============================================
// AI CALL
// ============================================

async function callAI(
  message: string,
  context: MemoryContext,
  conversationHistory: ConversationMessage[],
  maxTokens: number = 300
): Promise<CoachResponse> {
  const contextString = formatContextForPrompt(context);
  
  const historyString = conversationHistory
    .slice(-4)
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');
  
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `${COACH_SYSTEM_PROMPT}\n\nATHLETE CONTEXT:\n${contextString}`,
    },
  ];
  
  // Add conversation history
  for (const msg of conversationHistory.slice(-4)) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    });
  }
  
  // Add current message
  messages.push({
    role: 'user',
    content: message,
  });
  
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      messages,
      max_tokens: maxTokens,
      temperature: 0.3,
    });
    
    const responseText = completion.choices[0]?.message?.content || '';
    
    // Try to parse as JSON
    const parsed = parseCoachResponse(responseText);
    if (parsed) {
      return parsed;
    }
    
    // Fallback: wrap plain text in response format
    return {
      message: responseText,
    };
  } catch (error) {
    console.error('AI call failed:', error);
    return {
      message: "I'm having trouble processing that. Can you try again?",
    };
  }
}

// ============================================
// VECTOR STORE SEARCH
// ============================================

async function searchKnowledge(query: string): Promise<string> {
  const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;
  if (!vectorStoreId) {
    return '';
  }
  
  try {
    // Use OpenAI's file search (simplified - you may need to adjust based on your setup)
    // This is a placeholder - actual implementation depends on how you've set up the vector store
    return '';
  } catch (error) {
    console.error('Knowledge search failed:', error);
    return '';
  }
}

// ============================================
// MAIN BRAIN FUNCTION
// ============================================

export interface BrainInput {
  message: string;
  athleteId: string;
  memory: CoachMemory;
  conversationHistory: ConversationMessage[];
}

export interface BrainOutput {
  response: CoachResponse;
  intent: Intent;
  confidence: number;
  tokensUsed: number;
  processingTime: number;
}

export async function processMessage(input: BrainInput): Promise<BrainOutput> {
  const startTime = Date.now();
  
  // 1. Classify intent
  const classification = classifyIntent(input.message, input.conversationHistory);
  const { intent, confidence } = classification;
  
  // 2. Get intent metadata
  const metadata = INTENT_METADATA[intent];
  
  // 3. Handle template responses (no AI needed)
  if (!metadata.requiresAI && metadata.canUseTemplate) {
    const templateResponse = getTemplateResponse(intent);
    return {
      response: { message: templateResponse },
      intent,
      confidence,
      tokensUsed: 0,
      processingTime: Date.now() - startTime,
    };
  }
  
  // 4. Build context for AI
  const memoryContext = buildMemoryContext(input.memory, intent);
  
  // 5. Call AI
  const response = await callAI(
    input.message,
    memoryContext,
    input.conversationHistory,
    metadata.maxTokens
  );
  
  return {
    response,
    intent,
    confidence,
    tokensUsed: metadata.maxTokens, // Approximate
    processingTime: Date.now() - startTime,
  };
}

// ============================================
// DEFAULT MEMORY (for new users)
// ============================================

export function createDefaultMemory(name: string = 'Athlete'): CoachMemory {
  return {
    core: {
      name,
      experience: 'intermediate',
      goal: undefined,
      constraints: undefined,
      style: undefined,
    },
    metrics: {
      prs: [],
      zones: {
        easy: { min: '5:30', max: '6:30' },
        moderate: { min: '5:00', max: '5:30' },
        threshold: { min: '4:30', max: '5:00' },
        interval: { min: '4:00', max: '4:30' },
        max: { min: '3:30', max: '4:00' },
      },
      fitness: {
        ctl: 40,
        atl: 35,
        tsb: 5,
        acRatio: 0.875,
      },
    },
    patterns: {
      trainingResponse: 'unknown',
      complianceByDay: {},
      communicationStyle: 'standard',
      emotionalTriggers: [],
      riskFactors: [],
    },
    threads: {
      injuries: [],
      pendingFollowUps: [],
      focusAreas: [],
      recentConcerns: [],
      coachCommitments: [],
    },
    session: {
      recentWorkouts: [],
      conversationHighlights: [],
      unresolvedItems: [],
      todayPlan: undefined,
    },
  };
}

// ============================================
// EXPORTS
// ============================================

export type { CoachResponse, ConversationMessage };
export { Intent, classifyIntent };