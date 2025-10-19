import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a supportive LSAT coach. Generate ONE short, encouraging message (max 100 chars) based on user stats. Be specific, upbeat, and actionable. Use emojis sparingly (max 1).`;
    
    const userPrompt = `
User Stats:
- Current streak: ${userContext.streak} days
- Recent accuracy: ${userContext.recentAccuracy}%
- Weak areas: ${userContext.weakTypes?.join(', ') || 'None identified'}
- Last practice: ${userContext.daysSinceLastPractice} days ago
- Improvement trend: ${userContext.improvementTrend || 'stable'}
- Questions answered today: ${userContext.questionsToday || 0}
- Daily goal: ${userContext.dailyGoal || 10} questions

Context:
${userContext.streak === 0 ? "- User has no active streak, encourage starting one" : ""}
${userContext.daysSinceLastPractice > 2 ? "- User hasn't practiced in a while, gently remind them" : ""}
${userContext.improvementTrend === 'improving' ? "- User is improving, celebrate their progress" : ""}
${userContext.recentAccuracy < 60 ? "- User struggling with accuracy, offer encouragement" : ""}
${userContext.streakAtRisk ? "- User's streak is at risk, motivate them to practice today" : ""}

Generate a motivational message that feels personal and actionable.`;

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
          { role: "user", content: userPrompt }
        ],
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
    const message = data.choices[0]?.message?.content || "Keep up the great work! 💪";
    
    return new Response(
      JSON.stringify({ message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("motivation-engine error:", error);
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
