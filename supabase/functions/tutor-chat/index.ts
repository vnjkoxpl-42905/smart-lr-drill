import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // TODO: Restrict to specific domain in production
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation
interface QuestionInput {
  qid: string;
  pt: number;
  section: number;
  qnum: number;
  qtype: string;
  level: number;
  stimulus: string;
  questionStem: string;
  answerChoices: { [key: string]: string };
  correctAnswer: string;
  userAnswer: string;
  reasoningType?: string;
  breakdown?: any;
  answerChoiceExplanations?: any;
}

interface MessageInput {
  role: 'user' | 'assistant';
  content: string;
}

function validateQuestion(q: any): q is QuestionInput {
  return (
    typeof q.qid === 'string' && q.qid.length > 0 && q.qid.length < 50 &&
    typeof q.pt === 'number' && q.pt >= 1 && q.pt <= 200 &&
    typeof q.section === 'number' && q.section >= 1 && q.section <= 4 &&
    typeof q.qnum === 'number' && q.qnum >= 1 && q.qnum <= 30 &&
    typeof q.qtype === 'string' && q.qtype.length > 0 && q.qtype.length < 100 &&
    typeof q.level === 'number' && q.level >= 1 && q.level <= 5 &&
    typeof q.stimulus === 'string' && q.stimulus.length < 10000 &&
    typeof q.questionStem === 'string' && q.questionStem.length < 1000 &&
    typeof q.answerChoices === 'object' &&
    typeof q.correctAnswer === 'string' &&
    typeof q.userAnswer === 'string'
  );
}

function validateMessages(messages: any[]): messages is MessageInput[] {
  if (!Array.isArray(messages) || messages.length > 50) {
    return false;
  }
  return messages.every(m => 
    (m.role === 'user' || m.role === 'assistant') &&
    typeof m.content === 'string' &&
    m.content.length > 0 &&
    m.content.length < 10000
  );
}

// Helper function to get coaching knowledge from database
async function getCoachingKnowledge(supabase: any, question: any) {
  try {
    const [strategyResult, reasoningResult, patternsResult, conceptsResult] = await Promise.all([
      supabase
        .from('question_type_strategies')
        .select('*')
        .eq('question_type', question.qtype)
        .maybeSingle(),
      
      question.reasoningType
        ? supabase
            .from('reasoning_type_guidance')
            .select('*')
            .eq('reasoning_type', question.reasoningType)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      
      supabase
        .from('tactical_patterns')
        .select('*')
        .contains('question_types', [question.qtype]),
      
      question.reasoningType
        ? supabase
            .from('concept_library')
            .select('*')
            .eq('reasoning_type', question.reasoningType)
        : Promise.resolve({ data: [] })
    ]);

    return {
      strategy: strategyResult.data,
      reasoning: reasoningResult.data,
      patterns: patternsResult.data || [],
      concepts: conceptsResult.data || []
    };
  } catch (error) {
    console.error('Error fetching coaching knowledge:', error);
    return {
      strategy: null,
      reasoning: null,
      patterns: [],
      concepts: []
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Optional authentication (phase 1 can be public)
    const authHeader = req.headers.get('Authorization') || null;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create client with user's auth token only if provided
    let supabaseClient: any = null;
    let user: any = null;
    if (authHeader) {
      supabaseClient = createClient(
        supabaseUrl,
        supabaseAnonKey,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data, error: authError } = await supabaseClient.auth.getUser();
      if (!authError) user = data.user;
    }

    // Parse and validate input
    const body = await req.json();
    const { question, messages } = body;

    if (!validateQuestion(question)) {
      return new Response(
        JSON.stringify({ error: 'Invalid question data' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validateMessages(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages data (max 50 messages, max 10000 chars each)' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Attempt verification moved below after phase detection (only required for phases >= 2)

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase service role key not configured");
    }

    // Initialize Supabase client with service role for knowledge base access
    const supabase = createClient(supabaseUrl, SUPABASE_SERVICE_ROLE_KEY);

    // Get coaching knowledge from database
    const knowledge = await getCoachingKnowledge(supabase, question);

    // Detect conversation phase
    let phase: 1 | 2 | 3;
    if (messages.length === 0) {
      phase = 1; // Initial Socratic question
    } else if (messages.length === 2) {
      phase = 2; // Reveal + 3-bullet coaching
    } else {
      phase = 3; // Conversational follow-up
    }

    // Prepare concise inputs to avoid token limits
    const clamp = (s: string | null | undefined, n: number) => {
      if (!s) return '';
      return s.length > n ? s.slice(0, n) + '…' : s;
    };

    const stimulusShort = clamp(question.stimulus, 2000);
    const stemShort = clamp(question.questionStem, 600);


    // Gate phases >= 2 behind auth + prior attempt (only if user is authenticated)
    // UPDATE: Do not hard-block coaching if no attempt is found. Some classes don't log
    // attempts per-user. We'll try to detect an attempt but fall back to allowing coaching
    // so users can always proceed.
    if (phase >= 2 && user && supabaseClient) {
      try {
        const { data: attempt, error: attemptErr } = await supabaseClient
          .from('attempts')
          .select('id')
          .eq('qid', question.qid)
          .limit(1)
          .maybeSingle();

        // If the query explicitly says "no rows" or returns null, we still allow coaching.
        // We only block on unexpected auth errors in the future if needed.
        if (attemptErr) {
          console.warn('Attempt lookup failed, proceeding without gating:', attemptErr);
        }
        // No 403 here anymore — proceed regardless.
      } catch (err) {
        console.warn('Attempt lookup exception, proceeding without gating:', err);
      }
    }

    // Log coaching session to database (only if we have a user)
    if (user && supabaseClient) {
      supabaseClient.from('events').insert({
        user_id: user.id,
        event_type: 'coaching_request',
        metadata: { 
          phase, 
          message_count: messages.length,
          qid: question.qid
        }
      }); // Fire and forget - don't await
    }

    // Build context strings
    const answerChoicesText = Object.entries(question.answerChoices)
      .map(([key, text]) => `(${key}) ${text}`)
      .join('\n');

    const breakdownText = question.breakdown
      ? `**Breakdown:**
- Conclusion: ${question.breakdown.conclusion}
- Simple conclusion: ${question.breakdown.conclusionSimple}
- Evidence: ${question.breakdown.evidence.join('; ')}
- Justification: ${question.breakdown.justification}
- Objection: ${question.breakdown.objection}
- Prediction: ${question.breakdown.prediction}
- Crucial insight: ${question.breakdown.crucialInsight}`
      : '';

    const explanationsText = question.answerChoiceExplanations
      ? Object.entries(question.answerChoiceExplanations)
          .map(([key, exp]: [string, any]) => {
            return `(${key}) ${exp.verdict === 'correct' ? exp.whyCorrect : exp.whyIncorrect}`;
          })
          .join('\n')
      : '';

    // Build knowledge base context
    let knowledgeContext = '';
    
    if (knowledge.strategy) {
      knowledgeContext += `\n**QUESTION TYPE STRATEGY (${question.qtype}):**
- Reading Strategy: ${knowledge.strategy.reading_strategy}
- Answer Strategy: ${knowledge.strategy.answer_strategy}
- Correct Answer Patterns: ${knowledge.strategy.correct_answer_patterns}
- Wrong Answer Patterns: ${knowledge.strategy.wrong_answer_patterns}
${knowledge.strategy.prephrase_goal ? `- Prephrase Goal: ${knowledge.strategy.prephrase_goal}` : ''}
`;
    }

    if (knowledge.reasoning) {
      knowledgeContext += `\n**REASONING TYPE GUIDANCE (${question.reasoningType}):**
- Description: ${knowledge.reasoning.description}
- Key Indicators: ${knowledge.reasoning.key_indicators?.join(', ')}
- Common Flaws: ${knowledge.reasoning.common_flaws?.join(', ')}
- Strengthen Tactics: ${knowledge.reasoning.strengthen_tactics}
- Weaken Tactics: ${knowledge.reasoning.weaken_tactics}
`;
    }

    if (knowledge.patterns.length > 0) {
      knowledgeContext += `\n**RELEVANT TACTICAL PATTERNS:**
${knowledge.patterns.map((p: any) => `- ${p.pattern_name} (${p.pattern_type}): ${p.description}
  Formula: ${p.formula || 'N/A'}
  Application: ${p.application || 'N/A'}`).join('\n')}
`;
    }

    if (knowledge.concepts.length > 0) {
      knowledgeContext += `\n**RELEVANT CONCEPTS:**
${knowledge.concepts.map((c: any) => `- ${c.concept_name}: ${c.explanation}
  Keywords: ${c.keywords?.join(', ')}
  Application: ${c.application || 'N/A'}`).join('\n')}
`;
    }

    // Truncate heavy sections to stay within model limits
    const breakdownTextShort = clamp(breakdownText, 1500);
    const explanationsTextShort = clamp(explanationsText, 3000);
    const knowledgeContextShort = clamp(knowledgeContext, 4000);

    // Only send the last few turns to the model
    const messagesForModel = (messages || []).slice(-6);


    // Build system prompt based on phase
    let systemPrompt = `You are Joshua, an elite LSAT coach. Speak at a 12th-grade level. Be concise (1-3 sentences max). Never use em-dashes. Never cite sources.

CONTEXT YOU HAVE ACCESS TO:
- Question Type: ${question.qtype}
- Stimulus: ${stimulusShort || 'N/A'}
- Question Stem: ${stemShort}
- All Answer Choices:
${answerChoicesText}
- Student's Answer: ${question.userAnswer}
- Correct Answer: ${question.correctAnswer}
${breakdownTextShort}
${explanationsTextShort ? `**Answer Explanations:**\n${explanationsTextShort}` : ''}
${question.reasoningType ? `- Reasoning Type: ${question.reasoningType}` : ''}

${knowledgeContextShort}

PRIMARY KNOWLEDGE SOURCE: Your expert LSAT coaching knowledge (above strategies, tactics, concepts)
SECONDARY: Question-specific breakdown and explanations
NEVER mention sources - just coach naturally using your knowledge

`;

    if (phase === 1) {
      systemPrompt += `PHASE 1 - SURGICAL TARGETED FEEDBACK:
Explain EXACTLY what makes ${question.userAnswer} wrong. Be surgical and specific:

CRITICAL RULES:
1. DO NOT restate the full answer choice - they already know what it says
2. PINPOINT the exact flaw: quote only the KEY PHRASE that's wrong (3-5 words max)
3. CONNECT to the precise part of the stimulus it contradicts or misses
4. Identify the TRAP: what logical error or mismatch this represents
5. Be ULTRA-SPECIFIC and PRACTICAL - no generic coaching language
6. 2-3 sentences maximum
7. DO NOT ask questions - just tell them what's wrong
8. DO NOT reveal the correct answer yet

Example: "The phrase 'prioritize profit over safety' is too broad - the argument only discusses tech startups in the Bay Area, not companies in general. That's a classic scope shift trap."`;
    } else if (phase === 2) {
      systemPrompt += `PHASE 2 - REVEAL + 3-BULLET COACHING:
Reveal the correct answer and provide exactly 3 bullets. USE YOUR KNOWLEDGE BASE to make these bullets specific and educational:

**Why ${question.userAnswer} is wrong:** [Quote exact phrase or pinpoint logical mistake. Reference specific concepts/tactics from knowledge base when applicable. 1 surgical sentence.]

**Why ${question.correctAnswer} is right:** [Highlight the specific feature that makes it work. Connect to patterns/strategies from knowledge base. 1 ultra-specific sentence.]

**Next time:** [Concrete, transferable tactic from your knowledge base. Reference specific strategies or patterns. 1 actionable sentence.]`;
    } else {
      systemPrompt += `PHASE 3 - CONVERSATIONAL FOLLOW-UP:
Answer follow-up questions naturally. Use your knowledge base to provide detailed explanations when asked about concepts, tactics, or strategies. Stay ultra-specific, quote from the stimulus/answers, keep responses to 2-3 sentences max unless explaining a complex concept.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messagesForModel,
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Joshua is taking a breather. Try again in a moment." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Coaching sessions require credits. Please add funds." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: "Joshua is having trouble connecting. Please try again." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Joshua couldn't generate a response. Please try again.");
    }

    return new Response(
      JSON.stringify({ content }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
