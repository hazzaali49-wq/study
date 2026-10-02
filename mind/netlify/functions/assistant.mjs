export default async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!process.env.OPENAI_API_KEY) return Response.json({ error: "AI key not configured" }, { status: 503 });

  try {
    const body = await request.json();
    const message = body.message || "";
    const context = body.context || {};

    const instructions = [
      "You are Mind AI, the concise assistant inside a private personal dashboard.",
      "Help with day planning, study priorities, reminders, notes, personal spending, work shifts and savings progress.",
      "Use only the supplied dashboard context. Never invent transactions, deadlines or commitments.",
      "When the user explicitly asks to add something, return an action so the app can perform it.",
      "Use workAndSavings context for shifts left, paid hours left, monthly targets and savings progress. Logged shift earnings are gross estimates and are not wages actually saved.",
      "Keep advice practical and concise.",
      "Return ONLY valid JSON with this shape: {\"reply\":\"text\",\"actions\":[...]}",
      "Allowed actions:",
      "{\"type\":\"add_note\",\"title\":\"...\",\"body\":\"...\",\"tags\":[\"...\"]}",
      "{\"type\":\"add_day_item\",\"title\":\"...\",\"date\":\"YYYY-MM-DD\",\"time\":\"HH:MM\",\"duration\":60,\"itemType\":\"Study|Personal|Health|Work|Admin\",\"priority\":\"Low|Normal|High\"}",
      "{\"type\":\"add_study_task\",\"subject\":\"...\",\"topic\":\"...\",\"dueDate\":\"YYYY-MM-DD\",\"minutes\":60,\"priority\":\"Low|Medium|High\"}",
      "{\"type\":\"add_transaction\",\"description\":\"...\",\"amount\":12.5,\"kind\":\"Expense|Income\",\"category\":\"Food|Transport|Shopping|Health|Education|Bills|Fun|Income|Other\",\"date\":\"YYYY-MM-DD\",\"payment\":\"Card|Cash|Bank transfer|Other\",\"note\":\"...\"}",
      "{\"type\":\"add_reminder\",\"title\":\"...\",\"date\":\"YYYY-MM-DD\",\"time\":\"HH:MM\",\"details\":\"...\"}",
      "{\"type\":\"add_shift\",\"date\":\"YYYY-MM-DD\",\"hours\":6.5,\"rate\":14.15,\"note\":\"...\"}"
    ].join("\n");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.6-terra",
        instructions,
        input: "Return JSON. Dashboard context:\n" + JSON.stringify(context) + "\n\nUser request:\n" + message,
        reasoning: { effort: "low" },
        max_output_tokens: 900
      })
    });

    if (!response.ok) throw new Error(await response.text());
    const raw = await response.json();
    let output = "";

    if (Array.isArray(raw.output)) {
      for (const item of raw.output) {
        if (!Array.isArray(item.content)) continue;
        const part = item.content.find(x => x.type === "output_text");
        if (part && part.text) { output = part.text; break; }
      }
    }

    if (!output) throw new Error("No assistant text returned");
    const parsed = JSON.parse(output.trim());

    return Response.json({
      reply: parsed.reply || "Done.",
      actions: Array.isArray(parsed.actions) ? parsed.actions : []
    });
  } catch (error) {
    return Response.json(
      { error: "Assistant request failed", detail: String(error && error.message ? error.message : error) },
      { status: 500 }
    );
  }
};