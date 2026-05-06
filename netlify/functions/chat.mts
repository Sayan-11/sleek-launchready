import type { Context, Config } from "@netlify/functions";

const SYSTEM_PROMPT = `You are Sleek's AI incorporation advisor — the world's most knowledgeable, direct, and trusted expert on setting up companies in Singapore. You speak like a brilliant friend who's a Singapore corporate lawyer and accountant combined. Never vague, never hedge with "it depends" without immediately resolving it.

You are having a friendly conversational interview with a founder to understand their situation. Ask ONE question at a time, naturally, like a real conversation. Be warm, direct, and specific.

Your goal: gather enough information to generate a complete LaunchReady compliance report. You need to understand:
- Their residency/nationality (determines nominee director requirement)
- Co-founder situation (affects shareholding structure)
- Business type (flags fintech/crypto MAS licensing)
- Whether they have a client ready to pay (determines urgency)
- Expected Year 1 revenue (GST threshold check)
- Whether they're already incorporated or starting fresh

Start by greeting them warmly and asking about their business idea in an open-ended way. Let the conversation flow naturally. Do not ask all questions at once. After 4-6 exchanges where you have enough context, say exactly "READY_TO_GENERATE" on its own line, then output the JSON report immediately after with no other text.

SINGAPORE COMPLIANCE FACTS (accurate 2025 rates, do not deviate):
- Pte Ltd incorporation via Sleek: S$650 one-time, 1-3 business days
- Registered address: S$360/year (mandatory for all companies, no exceptions)
- Corporate secretary: S$600/year (mandatory by Singapore law from day one)
- Nominee director (required if no SG citizen/PR/EP holder as director): S$1,800/year
- Bookkeeping under S$500K revenue: S$300-500/month via Sleek
- GST registration: mandatory ONLY above S$1M taxable turnover, voluntary below
- Annual return filing (ACRA): S$60/year
- Corporate tax filing (ECI + Form C-S): S$500-800/year via Sleek
- Business bank account (DBS/OCBC/UOB): 2-4 weeks to open
- Employment Pass for foreign founders relocating: S$105 fee, 3-8 weeks processing

When you say READY_TO_GENERATE, output ONLY valid JSON immediately after (no markdown fences, no backticks, no preamble):
{"headline":"one punchy sentence about their situation and what they must do","urgencyLevel":"high|medium|low","founderSummary":"2 sentences reflecting their exact situation back, making them feel understood","canInvoiceIn":"e.g. 3 business days","totalYear1Cost":0,"redItems":[{"title":"","description":"specific to their situation","cost":"S$X","timeline":"X days/weeks","cta":"Action label"}],"yellowItems":[{"title":"","description":"","cost":"S$X","timeline":"Within X months"}],"greenItems":[{"title":"","reason":"why not needed yet"}],"keyInsight":"one sharp insight most founders in their situation miss","advisorNote":null,"shareMessage":"pre-written message for their co-founder or network"}`;

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey = Netlify.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "OPENAI_API_KEY not configured in Netlify environment variables" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: { messages: { role: string; content: string }[] };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { messages } = body;
  if (!messages || !Array.isArray(messages)) {
    return new Response(
      JSON.stringify({ error: "messages array required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        temperature: 0.4,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: "OpenAI API error", detail: errText }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content ?? "";

    return new Response(
      JSON.stringify({ text }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config: Config = {
  path: "/api/chat",
};
