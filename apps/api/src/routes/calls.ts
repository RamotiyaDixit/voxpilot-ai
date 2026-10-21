import { Router } from "express";
import { z } from "zod";
import { agents, calls, createCall } from "../store.js";

export const callsRouter = Router();

callsRouter.get("/", (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit ?? 25) || 25, 1), 100);
  const data = [...calls.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  res.json({ data });
});

callsRouter.get("/:id", (req, res) => {
  const call = calls.get(req.params.id);
  if (!call) return res.status(404).json({ error: "Call not found" });
  res.json({ data: call });
});

const demoSchema = z.object({
  agentId: z.string().min(1),
  transcript: z.array(z.object({
    role: z.enum(["assistant", "user"]),
    content: z.string().trim().min(1).max(4000)
  })).min(1).max(100),
  durationSeconds: z.number().int().min(0).max(86400).default(0)
});

callsRouter.post("/demo", (req, res) => {
  const input = demoSchema.parse(req.body);
  const agent = agents.get(input.agentId);
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  const transcript = input.transcript.map((message) => ({ ...message, timestamp: new Date().toISOString() }));
  const userText = transcript.filter((message) => message.role === "user").map((message) => message.content).join(" ");
  const sentiment = /angry|upset|terrible|bad|frustrat/i.test(userText) ? "negative" : /thanks|great|excellent|good/i.test(userText) ? "positive" : "neutral";
  const call = createCall({
    agentId: agent.id,
    agentName: agent.name,
    callerLabel: "Browser playground",
    status: "completed",
    durationSeconds: input.durationSeconds,
    sentiment,
    summary: userText ? `Demo conversation with ${transcript.filter((message) => message.role === "user").length} user turn(s).` : "Demo conversation completed.",
    transcript
  });
  res.status(201).json({ data: call });
});
