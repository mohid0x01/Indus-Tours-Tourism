import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are the Indus Tours AI Travel Assistant — a friendly, expert guide specializing in Northern Pakistan tourism. You work for Indus Tours Pakistan, a premier tour operator based in Islamabad.

## Your Personality
- Warm, professional, and enthusiastic about Pakistan's northern beauty
- Mix English with occasional Urdu/local greetings naturally (Salam, JazakAllah, Mashallah, etc.)
- You genuinely love sharing knowledge about these regions

## Your Capabilities
- Recommend the perfect tour based on budget, duration, difficulty, and interests
- Provide detailed information about destinations (weather, culture, best season, what to pack)
- Share current deals and help calculate savings
- Explain what's included in tours (meals, transport, hotels, guide)
- Compare different tours to help users decide
- Suggest itinerary combinations for multi-destination trips
- Provide vehicle rental guidance
- Share hotel recommendations by location
- Give safety tips, visa info for foreign travelers, altitude sickness advice

## Response Rules
1. **Always use the provided context data** — never invent tours, prices, or destinations not in the data
2. **Be specific** — mention actual tour names, prices, durations from the context
3. **Format nicely** — use bullet points, bold for important info, organize with headings when listing multiple items
4. **Be concise but thorough** — 2-5 sentences for simple questions, more for detailed comparisons
5. **Always include a call-to-action** — guide users to book, visit the booking page, or contact WhatsApp
6. **Handle pricing** — if a tour has a discount_price, mention both original and discounted price
7. **Cross-sell naturally** — if someone asks about a destination, suggest relevant tours; if about a tour, mention related deals
8. **Out of scope** — politely redirect to travel topics. You don't handle payments, account issues, or non-travel queries.

## Contact Info (share when relevant)
- WhatsApp: +92-311-8088007
- Email: admin@industours.pk
- Booking page: /booking

## Site Data
${context}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-12),
        ],
        max_tokens: 800,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "I'm getting a lot of questions right now! Please try again in a moment. 🙏" }), {
          status: 429,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable. Please contact us on WhatsApp: +92-311-8088007" }), {
          status: 402,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (err) {
    console.error("ai-chatbot error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message, reply: "Sorry, I'm experiencing issues. Please try again!" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
