import { randomUUID } from "node:crypto";

export type Agent = {
  id: string;
  name: string;
  purpose: string;
  greeting: string;
  instructions: string;
  voiceStyle: string;
  createdAt: string;
  updatedAt: string;
};

export type TranscriptMessage = { role: "assistant" | "user"; content: string; timestamp: string };
export type CallRecord = {
  id: string;
  agentId: string;
  agentName: string;
  callerLabel: string;
  status: "completed" | "failed" | "in_progress";
  durationSeconds: number;
  sentiment: "positive" | "neutral" | "negative";
  summary: string;
  transcript: TranscriptMessage[];
  createdAt: string;
};

const now = () => new Date().toISOString();
const seedAgent: Agent = {
  id: "agent-customer-success",
  name: "Nova · Customer Care",
  purpose: "Answer common customer questions and route issues to the right team.",
  greeting: "Hi there! I’m Nova from customer care. How can I help you today?",
  instructions: "Be warm, concise and accurate. Ask one question at a time. Never invent policies, prices or commitments. If you do not know, say so and offer a human follow-up.",
  voiceStyle: "warm",
  createdAt: now(),
  updatedAt: now()
};

export const agents = new Map<string, Agent>([[seedAgent.id, seedAgent]]);
export const calls = new Map<string, CallRecord>();

export function createCall(input: Omit<CallRecord, "id" | "createdAt">): CallRecord {
  const record: CallRecord = { ...input, id: randomUUID(), createdAt: now() };
  calls.set(record.id, record);
  return record;
}

export function touchAgent(agent: Agent): Agent {
  const updated = { ...agent, updatedAt: now() };
  agents.set(updated.id, updated);
  return updated;
}
