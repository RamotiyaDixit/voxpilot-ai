import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { agents, type Agent, touchAgent } from "../store.js";

export const agentsRouter = Router();

const agentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  purpose: z.string().trim().min(3).max(500),
  greeting: z.string().trim().min(2).max(2000),
  instructions: z.string().trim().min(2).max(8000),
  voiceStyle: z.string().trim().min(2).max(80).default("calm")
});

agentsRouter.get("/", (_req, res) => {
  res.json({ data: [...agents.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) });
});

agentsRouter.post("/", (req, res) => {
  const input = agentSchema.parse(req.body);
  const timestamp = new Date().toISOString();
  const agent: Agent = { ...input, id: randomUUID(), createdAt: timestamp, updatedAt: timestamp };
  agents.set(agent.id, agent);
  res.status(201).json({ data: agent });
});

agentsRouter.patch("/:id", (req, res) => {
  const existing = agents.get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Agent not found" });
  const partial = agentSchema.partial().parse(req.body);
  res.json({ data: touchAgent({ ...existing, ...partial }) });
});

agentsRouter.delete("/:id", (req, res) => {
  if (!agents.has(req.params.id)) return res.status(404).json({ error: "Agent not found" });
  agents.delete(req.params.id);
  res.json({ data: { deleted: true } });
});
