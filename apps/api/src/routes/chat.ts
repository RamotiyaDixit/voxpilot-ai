import { Router } from "express";
import { z } from "zod";
import { agents } from "../store.js";

export const chatRouter = Router();

const turnSchema = z.object({
  agentId: z.string().min(1),
  messages: z.array(z.object({
    role: z.enum(["assistant", "user"]),
    content: z.string().trim().min(1).max(4000)
  })).min(1).max(40)
});

function makeDemoReply(lastUserMessage: string, purpose: string): string {
  const text = lastUserMessage.toLowerCase();
  if (/human|person|representative|agent please|support team/.test(text)) {
    return "Absolutely. I can help get this to the right person. Could you share a brief summary of what you need so the team has the context?";
  }
  if (/price|pricing|cost|plan|subscription/.test(text)) {
    return "I can help you figure out the right option. I don’t have verified pricing information in this demo, so I won’t guess. Which product or service are you asking about?";
  }
  if (/refund|cancel|return/.test(text)) {
    return "I can help you understand the next step. I don’t have access to account records in this demo. Could you tell me which order or service this concerns?";
  }
  if (/hours|open|opening time/.test(text)) {
    return "I don’t have verified business hours configured for this demo, and I don’t want to give you the wrong information. Which location are you checking?";
  }
  return `Thanks for sharing that. I’m here to help with ${purpose.toLowerCase()} Could you tell me a little more about what you need, so I can guide you to the right next step?`;
}

async function generateReply(system: string, conversation: Array<{role:"assistant"|"user";content:string}>, purpose: string): Promise<{text:string; provider:"llm"|"demo"}> {
  const key = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL?.replace(/\/$/, "");
  if (key && baseUrl) {
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: process.env.AI_MODEL ?? "gpt-4o-mini",
          messages: [{ role: "system", content: system }, ...conversation],
          temperature: 0.4,
          max_tokens: 220
        }),
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) throw new Error(`LLM provider returned ${response.status}`);
      const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const text = payload.choices?.[0]?.message?.content?.trim();
      if (text) return { text, provider: "llm" };
    } catch (error) {
      console.error("LLM request failed; using demo response:", error);
    }
  }
  const lastUser = [...conversation].reverse().find((message) => message.role === "user")?.content ?? "";
  return { text: makeDemoReply(lastUser, purpose), provider: "demo" };
}

chatRouter.post("/turn", async (req, res, next) => {
  try {
    const input = turnSchema.parse(req.body);
    const agent = agents.get(input.agentId);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    const result = await generateReply(
      `You are ${agent.name}, a voice assistant. Purpose: ${agent.purpose}. Instructions: ${agent.instructions}. Be conversational, concise and safe. Never claim to have performed an action you did not perform. Do not invent business-specific facts.`,
      input.messages,
      agent.purpose
    );
    res.json({ data: { message: { role: "assistant", content: result.text }, provider: result.provider } });
  } catch (error) {
    next(error);
  }
});
