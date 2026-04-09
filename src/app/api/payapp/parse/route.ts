import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[api/payapp/parse] ANTHROPIC_API_KEY is not set");
    return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
  }

  let pdf: string;
  try {
    const body = await request.json();
    pdf = body.pdf;
    if (!pdf || typeof pdf !== "string") {
      return NextResponse.json({ error: "Missing or invalid pdf field" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  console.log("[api/payapp/parse] Sending PDF to Claude for parsing");

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdf,
              },
            },
            {
              type: "text",
              text: `You are a construction pay application (AIA G702/G703) parser.

Extract the Schedule of Values line items from this pay application PDF. For each line item, extract:
1. The description of the work
2. The "This Period" amount (column G or equivalent — the amount being billed in the current period, NOT the total scheduled value or contract amount)

Return ONLY a JSON object with this exact structure, no markdown fences, no explanation:
{"items":[{"description":"string","amount":number}]}

Rules:
- Only include items where the "This Period" amount is greater than 0
- Use the exact description from the Schedule of Values
- Amounts should be plain numbers (no $ or commas)
- If you cannot find a Schedule of Values or "This Period" column, return {"items":[]}`,
            },
          ],
        },
      ],
    });

    const rawText = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("");

    console.log("[api/payapp/parse] Claude raw response length:", rawText.length);

    // Strip markdown fences if present
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    let parsed: { items: Array<{ description: string; amount: number }> };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("[api/payapp/parse] Failed to parse Claude response as JSON:", cleaned.slice(0, 200));
      return NextResponse.json({ error: "Claude returned invalid JSON" }, { status: 500 });
    }

    // Filter to only items with amount > 0, ensure types are correct
    const items = (parsed.items ?? [])
      .filter((item) => item && typeof item.description === "string" && typeof item.amount === "number" && item.amount > 0)
      .map((item) => ({ description: item.description.trim(), amount: item.amount }));

    console.log("[api/payapp/parse] Extracted", items.length, "items with amount > 0");

    return NextResponse.json({ items });
  } catch (err) {
    console.error("[api/payapp/parse] Anthropic API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to parse PDF" },
      { status: 500 }
    );
  }
}
