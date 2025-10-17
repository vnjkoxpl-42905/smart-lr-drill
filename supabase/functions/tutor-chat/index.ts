import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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

PRIMARY KNOWLEDGE SOURCE: User's LSAT concept files (breakdown and explanations above)
BACKUP: LSAT Hacks, LSAT Demon, other LSAT platforms (but never mention these sources)

`;

    if (phase === 1) {
      systemPrompt += `PHASE 1 - SOCRATIC QUESTION:
Ask ONE Socratic question that points the student toward the flaw in their chosen answer (${question.userAnswer}). Do NOT reveal the correct answer (${question.correctAnswer}) yet. Be direct, clear, simple.

Example: "What specific group does answer B actually talk about, and does that match what the conclusion needs?"`;
    } else if (phase === 2) {
      systemPrompt += `PHASE 2 - REVEAL + 3-BULLET COACHING:
Reveal the correct answer and provide exactly 3 bullets:

**Why ${question.userAnswer} is wrong:** [Quote exact phrase or pinpoint logical mistake. 1 surgical sentence.]

**Why ${question.correctAnswer} is right:** [Highlight the specific feature that makes it work. 1 ultra-specific sentence.]

**Next time:** [Concrete, transferable tactic. 1 actionable sentence.]`;
    } else {
      systemPrompt += `PHASE 3 - CONVERSATIONAL FOLLOW-UP:
Answer follow-up questions naturally. Stay ultra-specific, quote from the stimulus/answers, keep responses to 2-3 sentences max.`;
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
        JSON.stringify({ error: "AI gateway error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
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
