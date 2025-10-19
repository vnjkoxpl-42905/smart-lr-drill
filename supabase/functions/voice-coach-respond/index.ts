import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, question, selectedAnswer, showContrast } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }
    
    const systemPrompt = `You are a concise LSAT coach. Respond in exactly 2-3 plain English sentences. No jargon, no technical terms, no counts.

Your response MUST have exactly 3 parts:
1. Reflect: Acknowledge what the student said (1 sentence)
2. Pinpoint: Explain the specific mismatch with the stimulus (1 sentence)
3. Next step: Give ONE concrete action to take (1 sentence)

${showContrast ? '\nOptional 4th sentence: One-line contrast between their choice vs the correct answer.' : ''}

Rules:
- Use everyday language (12th grade level)
- No em-dashes, no semicolons
- No phrases like "In this case" or "Here's the thing"
- Be direct and supportive`;

    const userPrompt = `Question Type: ${question.qtype}
Stimulus: ${question.stimulus.slice(0, 500)}...
Question: ${question.questionStem}
Student chose: (${selectedAnswer}) ${question.answerChoices[selectedAnswer]}
Correct answer: (${question.correctAnswer}) ${question.answerChoices[question.correctAnswer]}

Student's reasoning (spoken): "${transcript}"

Generate your 2-3 sentence coaching response.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit reached',
            fallback: 'Your reasoning shows good effort. Look closely at what the stem is actually asking, then try the question again with fresh eyes.'
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const coachReply = data.choices[0]?.message?.content || 
      'Your reasoning shows good effort. Look closely at what the stem is actually asking, then try the question again with fresh eyes.';
    
    const replyId = crypto.randomUUID();
    
    return new Response(
      JSON.stringify({ 
        coachReply,
        replyId,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        coachReply: 'Your reasoning shows good effort. Look closely at what the stem is actually asking, then try the question again with fresh eyes.',
        replyId: 'fallback-' + Date.now(),
        timestamp: new Date().toISOString(),
        fallback: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
