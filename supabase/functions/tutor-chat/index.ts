import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const { question, messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

    console.log(`Joshua coaching - Phase ${phase}`, {
      messageCount: messages.length,
      qid: `PT${question.pt}-S${question.section}-Q${question.qnum}`,
    });

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

    // Build system prompt based on phase
    let systemPrompt = `You are Joshua, an elite LSAT coach. Speak at a 12th-grade level. Be concise (1-3 sentences max). Never use em-dashes. Never cite sources.

CONTEXT YOU HAVE ACCESS TO:
- Question Type: ${question.qtype}
- Stimulus: ${question.stimulus || 'N/A'}
- Question Stem: ${question.questionStem}
- All Answer Choices:
${answerChoicesText}
- Student's Answer: ${question.userAnswer}
- Correct Answer: ${question.correctAnswer}
${breakdownText}
${explanationsText ? `**Answer Explanations:**\n${explanationsText}` : ''}
${question.reasoningType ? `- Reasoning Type: ${question.reasoningType}` : ''}

${knowledgeContext}

PRIMARY KNOWLEDGE SOURCE: Your expert LSAT coaching knowledge (above strategies, tactics, concepts)
SECONDARY: Question-specific breakdown and explanations
NEVER mention sources - just coach naturally using your knowledge

`;

    if (phase === 1) {
      systemPrompt += `PHASE 1 - SOCRATIC QUESTION:
Ask ONE Socratic question that points the student toward the flaw in their chosen answer (${question.userAnswer}). Use the knowledge base above to inform your question. Reference specific concepts, tactics, or patterns when relevant. Do NOT reveal the correct answer (${question.correctAnswer}) yet. Be direct, clear, simple.

Example: "What specific group does answer B actually talk about, and does that match what the conclusion needs?"`;
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
          ...messages,
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
    console.error("tutor-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
