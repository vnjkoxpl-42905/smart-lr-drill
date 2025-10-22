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
    const { request } = await req.json();

    // Input validation
    if (!request || typeof request !== 'string' || request.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Invalid request (max 500 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an LSAT Logic Reasoning drill configuration assistant. Parse user requests into structured drill configurations.

Available question types: Assumption, Disagree, Flaw, Inference, Justify, Main Point, Match, Method, Paradox, Principle, Strengthen, Weaken
Available difficulties: 1 (easiest) to 5 (hardest)
Available PrepTests: 101-152
Default set size: 10 questions

Examples:
"I want to practice flaw questions" → qtypes: ["Flaw"], difficulties: [1,2,3,4,5], pts: all, set_size: 10
"Give me 20 hard strengthen and weaken questions from PT 110-120" → qtypes: ["Strengthen","Weaken"], difficulties: [4,5], pts: [110-120], set_size: 20
"Easy assumption questions" → qtypes: ["Assumption"], difficulties: [1,2], pts: all, set_size: 10`;

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
          { role: "user", content: request }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_drill_config",
              description: "Extract drill configuration from user request",
              parameters: {
                type: "object",
                properties: {
                  qtypes: {
                    type: "array",
                    items: { type: "string" },
                    description: "Question types to practice"
                  },
                  difficulties: {
                    type: "array",
                    items: { type: "number", enum: [1, 2, 3, 4, 5] },
                    description: "Difficulty levels (1-5)"
                  },
                  pts: {
                    type: "array",
                    items: { type: "number" },
                    description: "PrepTest numbers to draw from"
                  },
                  set_size: {
                    type: "number",
                    description: "Number of questions in the set"
                  },
                  explanation: {
                    type: "string",
                    description: "Brief explanation of what was parsed"
                  }
                },
                required: ["qtypes", "difficulties", "pts", "set_size", "explanation"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_drill_config" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No tool call returned from AI");
    }

    const config = JSON.parse(toolCall.function.arguments);
    
    return new Response(
      JSON.stringify(config),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("parse-drill-request error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
