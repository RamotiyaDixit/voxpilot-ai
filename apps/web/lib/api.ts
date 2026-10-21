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

export type TranscriptMessage = {
  role: "assistant" | "user";
  content: string;
  timestamp?: string;
};

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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
    cache: "no-store"
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" })) as { error?: string };
    throw new Error(error.error ?? `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  agents: () => request<{ data: Agent[] }>("/api/agents"),
  createAgent: (payload: Omit<Agent, "id" | "createdAt" | "updatedAt">) =>
    request<{ data: Agent }>("/api/agents", { method: "POST", body: JSON.stringify(payload) }),
  updateAgent: (id: string, payload: Partial<Pick<Agent, "name" | "purpose" | "greeting" | "instructions" | "voiceStyle">>) =>
    request<{ data: Agent }>(`/api/agents/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteAgent: (id: string) => request<{ data: { deleted: boolean } }>(`/api/agents/${encodeURIComponent(id)}`, { method: "DELETE" }),
  chat: (agentId: string, messages: TranscriptMessage[]) =>
    request<{ data: { message: TranscriptMessage; provider: "llm" | "demo" } }>("/api/chat/turn", {
      method: "POST", body: JSON.stringify({ agentId, messages: messages.map(({ role, content }) => ({ role, content })) })
    }),
  calls: () => request<{ data: CallRecord[] }>("/api/calls"),
  saveDemoCall: (agentId: string, transcript: TranscriptMessage[], durationSeconds: number) =>
    request<{ data: CallRecord }>("/api/calls/demo", {
      method: "POST",
      body: JSON.stringify({ agentId, transcript: transcript.map(({ role, content }) => ({ role, content })), durationSeconds })
    })
};
