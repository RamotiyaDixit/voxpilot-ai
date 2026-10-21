"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, type Agent, type CallRecord, type TranscriptMessage } from "@/lib/api";

type SpeechRecognitionResult = { 0: { transcript: string }; isFinal: boolean };
type SpeechRecognitionEvent = { results: ArrayLike<SpeechRecognitionResult> };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

const starterAgent: Agent = {
  id: "agent-customer-success",
  name: "Nova · Customer Care",
  purpose: "Answer common customer questions and route issues to the right team.",
  greeting: "Hi there! I’m Nova from customer care. How can I help you today?",
  instructions: "Be warm, concise and accurate. Ask one question at a time. Never invent policies, prices or commitments. If you do not know, say so and offer a human follow-up.",
  voiceStyle: "warm",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const initialConversation = (greeting: string): TranscriptMessage[] => [
  { role: "assistant", content: greeting, timestamp: new Date().toISOString() }
];

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    wave: <><path d="M3 10v4M7 6v12M11 3v18M15 7v10M19 9v6M23 11v2" /></>,
    phone: <><path d="M5 4h4l2 5-2.5 1.5a15 15 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2C10 21 3 14 3 6a2 2 0 0 1 2-2Z" /></>,
    chart: <><path d="M4 19V5M4 19h17" /><path d="m7 15 4-4 3 2 5-7" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2A1.7 1.7 0 0 0 8 17.4l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1A1.7 1.7 0 0 0 4.4 12.1h-.2a1.7 1.7 0 0 1 0-3.4h.2A1.7 1.7 0 0 0 5.6 5.8l-.1-.1a1.7 1.7 0 1 1 2.4-2.4l.1.1A1.7 1.7 0 0 0 10.9 2.2V2a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 0 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.4 2.9Z" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    mic: <><rect x="9" y="2" width="6" height="13" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8" /></>,
    play: <path d="m8 5 12 7-12 7Z" />,
    stop: <rect x="6" y="6" width="12" height="12" rx="2" />,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2L12 3Z" /><path d="m19 15 1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    headset: <><path d="M3 13v-2a9 9 0 0 1 18 0v2" /><rect x="3" y="12" width="5" height="8" rx="2" /><rect x="16" y="12" width="5" height="8" rx="2" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>
  };
  return <svg {...common} aria-hidden="true">{paths[name] ?? paths.spark}</svg>;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function shortTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Home() {
  const [agents, setAgents] = useState<Agent[]>([starterAgent]);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [activeAgentId, setActiveAgentId] = useState(starterAgent.id);
  const [activeTab, setActiveTab] = useState("Overview");
  const [conversation, setConversation] = useState<TranscriptMessage[]>(initialConversation(starterAgent.greeting));
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [toast, setToast] = useState("");
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showCallDetail, setShowCallDetail] = useState<CallRecord | null>(null);
  const [agentName, setAgentName] = useState("");
  const [agentPurpose, setAgentPurpose] = useState("");
  const [agentInstructions, setAgentInstructions] = useState("Be warm, concise, honest and helpful. Ask one question at a time.");
  const [agentGreeting, setAgentGreeting] = useState("Hi there! I’m your voice assistant. How can I help?");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const conversationRef = useRef(conversation);

  const activeAgent = agents.find((agent) => agent.id === activeAgentId) ?? agents[0] ?? starterAgent;
  const totalCalls = calls.length + 128;
  const avgSeconds = calls.length ? Math.round(calls.reduce((sum, call) => sum + call.durationSeconds, 0) / calls.length) : 142;
  const positiveCount = calls.filter((call) => call.sentiment === "positive").length;

  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  useEffect(() => {
    const recognitionCtor = (window as SpeechWindow).SpeechRecognition ?? (window as SpeechWindow).webkitSpeechRecognition;
    setVoiceSupported(Boolean(recognitionCtor && "speechSynthesis" in window));
    void api.agents().then((result) => {
      if (result.data.length) {
        setAgents(result.data);
        setActiveAgentId((current) => result.data.some((agent) => agent.id === current) ? current : result.data[0].id);
      }
    }).catch(() => {
      setToast("Demo mode · API is offline");
    });
    void api.calls().then((result) => setCalls(result.data)).catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = toast ? window.setTimeout(() => setToast(""), 3600) : undefined;
    return () => { if (timer) window.clearTimeout(timer); };
  }, [toast]);

  useEffect(() => {
    if (activeAgent && conversation.length === 1 && conversation[0].role === "assistant" && conversation[0].content !== activeAgent.greeting) {
      setConversation(initialConversation(activeAgent.greeting));
    }
  }, [activeAgentId, activeAgent, conversation]);

  const appendMessage = useCallback((message: TranscriptMessage) => {
    setConversation((current) => {
      const next = [...current, { ...message, timestamp: new Date().toISOString() }];
      conversationRef.current = next;
      return next;
    });
  }, []);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = activeAgent?.voiceStyle === "bright" ? 1.08 : 0.98;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((voice) => /en-US|en-GB|en-IN/i.test(voice.lang));
    if (preferred) utterance.voice = preferred;
    window.speechSynthesis.speak(utterance);
  }, [activeAgent]);

  const sendMessage = useCallback(async (providedText?: string) => {
    const text = (providedText ?? input).trim();
    if (!text || isThinking) return;
    const userMessage: TranscriptMessage = { role: "user", content: text, timestamp: new Date().toISOString() };
    const nextConversation = [...conversationRef.current, userMessage];
    conversationRef.current = nextConversation;
    setConversation(nextConversation);
    setInput("");
    if (startTimeRef.current === null) startTimeRef.current = Date.now();
    setIsThinking(true);
    try {
      const result = await api.chat(activeAgent.id, nextConversation);
      const reply: TranscriptMessage = { ...result.data.message, timestamp: new Date().toISOString() };
      appendMessage(reply);
      speak(reply.content);
      if (result.data.provider === "demo") {
        setToast("Demo response · add an AI key for model-powered replies");
      }
    } catch {
      const fallback: TranscriptMessage = { role: "assistant", content: "I’m having trouble reaching the assistant service right now. Please try again in a moment." };
      appendMessage(fallback);
    } finally {
      setIsThinking(false);
    }
  }, [input, isThinking, activeAgent, appendMessage, speak]);

  const startListening = useCallback(() => {
    const Constructor = (window as SpeechWindow).SpeechRecognition ?? (window as SpeechWindow).webkitSpeechRecognition;
    if (!Constructor) {
      setToast("Speech recognition is not available in this browser. Try Chrome or use the text box.");
      return;
    }
    try {
      const recognition = new Constructor();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        const result = event.results[event.results.length - 1];
        if (result?.isFinal) void sendMessage(result[0].transcript);
      };
      recognition.onerror = () => {
        setIsListening(false);
        setToast("Microphone access was unavailable. Check your browser permissions.");
      };
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      if (startTimeRef.current === null) startTimeRef.current = Date.now();
    } catch {
      setIsListening(false);
      setToast("Could not start microphone. Check browser permissions and try again.");
    }
  }, [sendMessage]);

  const saveCall = useCallback(async () => {
    if (conversation.length <= 1) {
      setToast("Say or type something first to create a demo call.");
      return;
    }
    const durationSeconds = startTimeRef.current ? Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000)) : 1;
    try {
      const result = await api.saveDemoCall(activeAgent.id, conversation, durationSeconds);
      setCalls((current) => [result.data, ...current]);
      setShowCallDetail(result.data);
      setToast("Demo call saved to call history");
      setActiveTab("Call history");
    } catch {
      setToast("Could not save the call. Ensure the API is running.");
    }
  }, [conversation, activeAgent]);

  const resetConversation = useCallback(() => {
    window.speechSynthesis?.cancel();
    recognitionRef.current?.stop();
    setIsListening(false);
    setConversation(initialConversation(activeAgent.greeting));
    conversationRef.current = initialConversation(activeAgent.greeting);
    startTimeRef.current = null;
  }, [activeAgent]);

  const createAgent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const newAgent = {
      name: agentName.trim(),
      purpose: agentPurpose.trim(),
      greeting: agentGreeting.trim(),
      instructions: agentInstructions.trim(),
      voiceStyle: "warm"
    };
    try {
      const result = await api.createAgent(newAgent);
      setAgents((current) => [result.data, ...current]);
      setActiveAgentId(result.data.id);
      setConversation(initialConversation(result.data.greeting));
      setShowAgentModal(false);
      setAgentName("");
      setAgentPurpose("");
      setToast("Voice agent created");
    } catch {
      setToast("Could not create agent. Check that the API is running.");
    }
  };

  const recentCalls = useMemo(() => calls.slice(0, 5), [calls]);
  const sidebarItems = [
    { label: "Overview", icon: "grid" },
    { label: "Voice agents", icon: "wave" },
    { label: "Call history", icon: "phone" },
    { label: "Analytics", icon: "chart" }
  ];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Icon name="wave" size={23} /></div>
          <div><span className="brand-name">voxpilot<span>·</span></span><span className="brand-caption">VOICE AI STUDIO</span></div>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-avatar">V</div>
          <div className="workspace-info"><strong>VoxPilot workspace</strong><span>Free workspace</span></div>
          <span className="switch-caret">⌄</span>
        </div>

        <div className="nav-caption">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {sidebarItems.map((item) => (
            <button key={item.label} className={activeTab === item.label ? "nav-item active" : "nav-item"} onClick={() => setActiveTab(item.label)}>
              <Icon name={item.icon} size={18} /><span>{item.label}</span>{item.label === "Call history" && calls.length > 0 && <span className="nav-count">{calls.length}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <div className="upgrade-icon"><Icon name="spark" size={17} /></div>
            <strong>Make every call count.</strong>
            <p>Bring your voice agents to life with more integrations.</p>
            <button onClick={() => setToast("Provider integrations are on the roadmap for this starter.")}>Explore integrations <Icon name="arrow" size={14} /></button>
          </div>
          <button className="nav-item settings-item" onClick={() => setToast("Settings are demo-only in this starter.")}><Icon name="settings" size={18} /><span>Settings</span></button>
          <div className="profile-row">
            <div className="profile-avatar">DR</div>
            <div className="profile-info"><strong>Workspace admin</strong><span>admin@voxpilot.ai</span></div>
            <span className="profile-dots">···</span>
          </div>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><Icon name="chevron" size={14} /><strong>{activeTab}</strong></div>
          <div className="topbar-actions"><span className="system-status"><span className="status-dot" /> All systems operational</span><button className="icon-button" aria-label="Notifications" onClick={() => setToast("You’re all caught up.")}>◌<span className="notification-dot" /></button><div className="topbar-avatar">DR</div></div>
        </header>

        <div className="content-wrap">
          {activeTab === "Overview" && (
            <>
              <div className="welcome-row">
                <div><div className="eyebrow"><span className="eyebrow-line" /> YOUR VOICE, AMPLIFIED</div><h1>Good morning, Dixit <span className="wave-emoji">✳</span></h1><p className="subhead">Your voice agents are ready to have a conversation.</p></div>
                <button className="primary-button" onClick={() => setShowAgentModal(true)}><Icon name="plus" size={17} /> Create voice agent</button>
              </div>

              <section className="hero-card">
                <div className="hero-copy"><div className="hero-pill"><span className="hero-pill-dot" /> VOICE PLAYGROUND</div><h2>Conversations that<br />feel <em>human.</em></h2><p>Try your agent, tune its personality, and hear the difference. All from one place.</p><button className="hero-button" onClick={() => { setActiveTab("Voice agents"); }} >Open voice playground <Icon name="arrow" size={16} /></button><div className="hero-footnote"><span>✳</span> No phone number needed · Try it in your browser</div></div>
                <div className="hero-visual" aria-hidden="true">
                  <div className="orb-glow" /><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" />
                  <div className="voice-orb"><div className="orb-inner"><div className="orb-wave"><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></div></div>
                  <div className="floating-chip chip-top"><span className="chip-avatar">N</span><span><strong>Nova</strong><small>Listening...</small></span><span className="chip-equalizer"><i/><i/><i/><i/></span></div>
                  <div className="floating-chip chip-bottom"><span className="chip-spark"><Icon name="spark" size={15}/></span><span><strong>Natural conversation</strong><small>Powered by AI</small></span><span className="chip-check"><Icon name="check" size={12}/></span></div>
                  <div className="visual-caption">VOICE AGENT · 001</div>
                </div>
              </section>

              <div className="section-heading"><div><h2>Workspace overview</h2><p>A quick look at your voice operations.</p></div><span className="period-label"><Icon name="clock" size={14}/> Last 30 days <span>⌄</span></span></div>
              <div className="stats-grid">
                <StatCard title="Total conversations" value={totalCalls.toLocaleString()} change="+18.6%" note="vs. previous 30 days" icon="phone" chart={[20,28,24,39,35,42,31,51,48,60,53,72]} />
                <StatCard title="Active voice agents" value={String(agents.length).padStart(2, "0")} change={agents.length > 0 ? "Ready" : "Create one"} note="available to test" icon="wave" chart={[25,24,32,30,38,33,41,42,54,47,61,66]} />
                <StatCard title="Avg. call duration" value={formatDuration(avgSeconds)} change="+8.2%" note="vs. previous 30 days" icon="clock" chart={[35,42,34,47,44,51,43,55,49,63,59,70]} />
                <StatCard title="Positive sentiment" value={calls.length ? `${Math.round((positiveCount / calls.length) * 100)}%` : "94.8%"} change="+4.3%" note="vs. previous 30 days" icon="spark" chart={[22,32,29,39,36,48,43,54,50,62,58,75]} />
              </div>

              <div className="lower-grid">
                <section className="panel-card agents-card"><div className="card-heading"><div><h3>Your voice agents</h3><p>Build once. Have better conversations.</p></div><button className="text-action" onClick={() => setActiveTab("Voice agents")}>View all <Icon name="arrow" size={14}/></button></div>
                  <div className="agent-list">{agents.slice(0, 3).map((agent, index) => <button className="agent-row" key={agent.id} onClick={() => { setActiveAgentId(agent.id); setActiveTab("Voice agents"); }}><div className={`agent-avatar tone-${index % 3}`}>{agent.name.trim().charAt(0).toUpperCase()}</div><div className="agent-detail"><strong>{agent.name}</strong><span>{agent.purpose}</span></div><span className="agent-state"><i/> Ready</span><Icon name="chevron" size={16}/></button>)}</div>
                  <button className="new-agent-row" onClick={() => setShowAgentModal(true)}><span className="plus-tile"><Icon name="plus" size={16}/></span><span>Create a new voice agent</span><Icon name="arrow" size={15}/></button>
                </section>
                <section className="panel-card activity-card"><div className="card-heading"><div><h3>Recent conversations</h3><p>See what your agents have been up to.</p></div><button className="text-action" onClick={() => setActiveTab("Call history")}>All calls <Icon name="arrow" size={14}/></button></div>
                  {recentCalls.length ? <div className="recent-list">{recentCalls.slice(0, 4).map((call) => <button className="recent-row" key={call.id} onClick={() => setShowCallDetail(call)}><div className="call-icon"><Icon name="phone" size={16}/></div><div className="recent-detail"><strong>{call.agentName}</strong><span>{new Date(call.createdAt).toLocaleDateString()} · {formatDuration(call.durationSeconds)}</span></div><span className={`sentiment ${call.sentiment}`}>{call.sentiment}</span></button>)}</div> : <div className="empty-small"><div className="empty-icon"><Icon name="wave" size={22}/></div><strong>Your next great conversation starts here.</strong><p>Try the playground and save a demo call to see activity appear here.</p><button className="text-action" onClick={() => setActiveTab("Voice agents")}>Try a conversation <Icon name="arrow" size={14}/></button></div>}
                </section>
              </div>
            </>
          )}

          {activeTab === "Voice agents" && <VoiceAgents agents={agents} activeAgent={activeAgent} onSelect={(agent) => { setActiveAgentId(agent.id); setConversation(initialConversation(agent.greeting)); conversationRef.current = initialConversation(agent.greeting); startTimeRef.current = null; }} onCreate={() => setShowAgentModal(true)} conversation={conversation} input={input} onInput={setInput} onSend={sendMessage} onMic={startListening} isListening={isListening} isThinking={isThinking} voiceSupported={voiceSupported} onSave={saveCall} onReset={resetConversation} onToast={setToast} />}
          {activeTab === "Call history" && <CallHistory calls={calls} onOpen={setShowCallDetail} onTry={() => setActiveTab("Voice agents")} />}
          {activeTab === "Analytics" && <Analytics calls={calls} agents={agents} />}
        </div>

        <footer className="app-footer"><span>© 2026 VoxPilot AI</span><span><span className="footer-dot"/> Demo workspace <span className="footer-divider">·</span> Built for conversations</span><button onClick={() => setToast("This starter provides demo flows; configure auth before production use.")}>Help & feedback <span>↗</span></button></footer>
      </section>

      {showAgentModal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAgentModal(false); }}><form className="modal-card" onSubmit={createAgent}><div className="modal-top"><div><span className="modal-kicker">NEW AGENT</span><h2>Create your voice agent</h2><p>Give your agent a role and a voice. You can refine it later.</p></div><button className="icon-button" type="button" aria-label="Close dialog" onClick={() => setShowAgentModal(false)}><Icon name="close"/></button></div><label>Agent name<input value={agentName} onChange={(event) => setAgentName(event.target.value)} placeholder="e.g. Support specialist" minLength={2} required maxLength={120}/></label><label>What should it help with?<textarea value={agentPurpose} onChange={(event) => setAgentPurpose(event.target.value)} placeholder="Describe the main purpose of this agent..." minLength={3} required rows={3} maxLength={500}/></label><label>First greeting<textarea value={agentGreeting} onChange={(event) => setAgentGreeting(event.target.value)} required rows={2} maxLength={2000}/></label><label>Agent instructions<textarea value={agentInstructions} onChange={(event) => setAgentInstructions(event.target.value)} required rows={3} maxLength={8000}/></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowAgentModal(false)}>Cancel</button><button type="submit" className="primary-button"><Icon name="spark" size={16}/> Create agent</button></div></form></div>}

      {showCallDetail && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCallDetail(null); }}><section className="modal-card call-detail-modal"><div className="modal-top"><div><span className="modal-kicker">CALL RECORD</span><h2>{showCallDetail.agentName}</h2><p>{new Date(showCallDetail.createdAt).toLocaleString()} · {formatDuration(showCallDetail.durationSeconds)}</p></div><button className="icon-button" aria-label="Close dialog" onClick={() => setShowCallDetail(null)}><Icon name="close"/></button></div><div className="call-summary"><strong>Conversation summary</strong><p>{showCallDetail.summary}</p><div className="detail-tags"><span className="status-tag"><i/> {showCallDetail.status}</span><span className={`sentiment ${showCallDetail.sentiment}`}>{showCallDetail.sentiment} sentiment</span></div></div><div className="transcript-panel"><strong>Transcript</strong>{showCallDetail.transcript.map((message, index) => <div className={`transcript-line ${message.role}`} key={index}><span>{message.role === "assistant" ? "AI" : "YOU"}</span><p>{message.content}</p></div>)}</div><div className="modal-actions"><button className="secondary-button" onClick={() => setShowCallDetail(null)}>Close</button></div></section></div>}

      {toast && <div className="toast" role="status"><span className="toast-check"><Icon name="check" size={14}/></span>{toast}<button aria-label="Dismiss notification" onClick={() => setToast("")}><Icon name="close" size={14}/></button></div>}
    </main>
  );
}

function StatCard({ title, value, change, note, icon, chart }: { title: string; value: string; change: string; note: string; icon: string; chart: number[] }) {
  return <div className="stat-card"><div className="stat-top"><span>{title}</span><span className="stat-icon"><Icon name={icon} size={17}/></span></div><div className="stat-value">{value}</div><div className="stat-bottom"><div><span className={change === "Ready" || change === "Create one" ? "change-pill" : "change-pill positive"}>{change}</span><span className="stat-note">{note}</span></div><div className="sparkline" aria-hidden="true">{chart.map((height, index) => <i key={index} style={{ height: `${height}%` }}/>)}</div></div></div>;
}

function VoiceAgents({ agents, activeAgent, onSelect, onCreate, conversation, input, onInput, onSend, onMic, isListening, isThinking, voiceSupported, onSave, onReset, onToast }: {
  agents: Agent[]; activeAgent: Agent; onSelect: (agent: Agent) => void; onCreate: () => void; conversation: TranscriptMessage[]; input: string; onInput: (value: string) => void; onSend: (text?: string) => void; onMic: () => void; isListening: boolean; isThinking: boolean; voiceSupported: boolean; onSave: () => void; onReset: () => void; onToast: (value: string) => void;
}) {
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [conversation, isThinking]);
  return <div className="subpage"><div className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-line"/> DESIGN & TEST</div><h1>Voice agents</h1><p className="subhead">Bring your agent to life in the voice playground.</p></div><button className="primary-button" onClick={onCreate}><Icon name="plus" size={17}/> New agent</button></div><div className="playground-layout"><section className="panel-card agent-picker"><div className="card-heading"><div><h3>Your agents</h3><p>Select an agent to try.</p></div><span className="count-badge">{agents.length}</span></div><div className="picker-list">{agents.map((agent, index) => <button key={agent.id} className={activeAgent.id === agent.id ? "picker-agent selected" : "picker-agent"} onClick={() => onSelect(agent)}><div className={`agent-avatar tone-${index % 3}`}>{agent.name.charAt(0)}</div><span><strong>{agent.name}</strong><small>{agent.purpose}</small></span><Icon name="chevron" size={15}/></button>)}</div><div className="agent-config"><span className="config-label">AGENT PURPOSE</span><p>{activeAgent.purpose}</p><span className="config-label">VOICE STYLE</span><div className="voice-style-chip"><span className="mini-wave"><i/><i/><i/><i/></span>{activeAgent.voiceStyle.charAt(0).toUpperCase() + activeAgent.voiceStyle.slice(1)} voice</div><span className="config-label">SYSTEM INSTRUCTIONS</span><p>{activeAgent.instructions}</p><button className="outline-full-button" onClick={() => onToast("Agent editing is coming soon. Create a new agent to change its configuration.")}>Edit agent <Icon name="arrow" size={14}/></button></div></section>
    <section className="panel-card playground-card"><div className="playground-head"><div><div className="live-label"><span className="status-dot"/> INTERACTIVE PLAYGROUND</div><h3>{activeAgent.name}</h3><p>Talk naturally. Your agent will respond in real time.</p></div><div className="ready-pill"><span/> Ready</div></div><div className="playground-orb-wrap"><div className="orb-halo"/><div className="playground-orb"><div className="orb-wave large"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></div><div className="orb-status">{isListening ? "Listening to you..." : isThinking ? "Thinking through it..." : "Ready when you are"}</div><div className="orb-visual-caption">VOXPILOT VOICE ENGINE</div></div><div className="quick-prompts"><span>TRY ASKING</span><button onClick={() => onSend("Can you tell me what you can help with?")}>What can you help with?</button><button onClick={() => onSend("I need to speak to a human please.")}>Talk to a human</button></div><div className="chat-transcript">{conversation.map((message, index) => <div className={`chat-message ${message.role}`} key={`${index}-${message.content.slice(0, 12)}`}><span className="chat-avatar">{message.role === "assistant" ? activeAgent.name.charAt(0) : "Y"}</span><div><span className="chat-role">{message.role === "assistant" ? activeAgent.name : "You"}{message.timestamp && <small>{shortTime(message.timestamp)}</small>}</span><p>{message.content}</p></div></div>)}{isThinking && <div className="chat-message assistant"><span className="chat-avatar">{activeAgent.name.charAt(0)}</span><div><span className="chat-role">{activeAgent.name}</span><p className="typing-dots"><i/><i/><i/></p></div></div>}<div ref={transcriptEndRef}/></div><form className="message-composer" onSubmit={(event) => { event.preventDefault(); onSend(); }}><input value={input} onChange={(event) => onInput(event.target.value)} placeholder="Type a message to your agent..." aria-label="Message your voice agent" maxLength={4000}/><button type="submit" disabled={!input.trim() || isThinking} aria-label="Send message" className="send-button"><Icon name="arrow" size={17}/></button></form><div className="playground-controls"><button className={isListening ? "mic-button listening" : "mic-button"} onClick={onMic} disabled={isThinking || isListening}><Icon name="mic" size={17}/>{isListening ? "Listening..." : "Start speaking"}</button><button className="secondary-button" onClick={onReset}><Icon name="close" size={14}/> Reset</button><button className="save-call-button" onClick={onSave}><Icon name="phone" size={14}/> Save demo call</button></div><div className="browser-note">{voiceSupported ? "Browser voice is available. Microphone permission may be required." : "Browser voice varies by browser; type a message to try the conversation."} No real phone call is placed.</div></section></div></div>;
}

function CallHistory({ calls, onOpen, onTry }: { calls: CallRecord[]; onOpen: (call: CallRecord) => void; onTry: () => void }) {
  return <div className="subpage"><div className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-line"/> CONVERSATION LOGS</div><h1>Call history</h1><p className="subhead">Review demo conversations and their transcripts.</p></div><button className="primary-button" onClick={onTry}><Icon name="mic" size={16}/> Try a conversation</button></div><section className="panel-card history-table-card"><div className="card-heading"><div><h3>Recent calls</h3><p>{calls.length} saved demo conversation{calls.length === 1 ? "" : "s"}</p></div><span className="count-badge">{calls.length}</span></div>{calls.length ? <div className="table-scroll"><table><thead><tr><th>AGENT</th><th>DATE & TIME</th><th>DURATION</th><th>SENTIMENT</th><th>STATUS</th><th/></tr></thead><tbody>{calls.map((call) => <tr key={call.id}><td><div className="table-agent"><div className="tiny-agent-avatar">{call.agentName.charAt(0)}</div><div><strong>{call.agentName}</strong><small>{call.callerLabel}</small></div></div></td><td>{new Date(call.createdAt).toLocaleString()}</td><td>{formatDuration(call.durationSeconds)}</td><td><span className={`sentiment ${call.sentiment}`}>{call.sentiment}</span></td><td><span className="status-tag"><i/> Completed</span></td><td><button className="table-open" onClick={() => onOpen(call)} aria-label="Open call details"><Icon name="chevron" size={16}/></button></td></tr>)}</tbody></table></div> : <div className="empty-state"><div className="empty-icon large-empty"><Icon name="phone" size={24}/></div><h3>Nothing on the line yet.</h3><p>When you save a demo conversation, the transcript and call details will show up here.</p><button className="primary-button" onClick={onTry}><Icon name="mic" size={16}/> Open voice playground</button></div>}</section><div className="privacy-note"><Icon name="spark" size={17}/><p><strong>Demo data note</strong><br/>Saved transcripts are kept in API memory and reset when the API restarts. Connect durable storage and add retention controls before production use.</p></div></div>;
}

function Analytics({ calls, agents }: { calls: CallRecord[]; agents: Agent[] }) {
  const sentimentCount = calls.reduce((acc, call) => { acc[call.sentiment] += 1; return acc; }, { positive: 0, neutral: 0, negative: 0 });
  const totalDuration = calls.reduce((sum, call) => sum + call.durationSeconds, 0);
  const average = calls.length ? Math.round(totalDuration / calls.length) : 0;
  return <div className="subpage"><div className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-line"/> PERFORMANCE INSIGHTS</div><h1>Analytics</h1><p className="subhead">Understand how your voice agents are performing.</p></div><span className="period-label"><Icon name="clock" size={14}/> All saved demo calls</span></div><div className="stats-grid analytics-stats"><StatCard title="Saved demo calls" value={String(calls.length)} change="Tracked" note="in this API session" icon="phone" chart={[14,28,24,40,35,50,43,62,55,69,64,74]}/><StatCard title="Average duration" value={formatDuration(average)} change="Calculated" note="from saved calls" icon="clock" chart={[22,30,28,40,35,42,48,44,56,52,65,68]}/><StatCard title="Voice agents" value={String(agents.length)} change="Configured" note="in this workspace" icon="wave" chart={[30,32,32,44,44,48,48,54,54,66,66,72]}/><StatCard title="Negative sentiment" value={String(sentimentCount.negative)} change="Review" note="saved calls flagged" icon="chart" chart={[70,65,60,57,48,44,40,39,34,30,25,20]}/></div><div className="analytics-grid"><section className="panel-card"><div className="card-heading"><div><h3>Sentiment breakdown</h3><p>Based on saved demo transcripts.</p></div></div><div className="sentiment-bars">{(["positive", "neutral", "negative"] as const).map((sentiment) => <div className="sentiment-bar-row" key={sentiment}><span className={`sentiment ${sentiment}`}>{sentiment}</span><div className="bar-track"><i className={sentiment} style={{ width: `${calls.length ? (sentimentCount[sentiment] / calls.length) * 100 : 0}%` }}/></div><strong>{sentimentCount[sentiment]}</strong></div>)}</div></section><section className="panel-card"><div className="card-heading"><div><h3>Performance snapshot</h3><p>Current session at a glance.</p></div></div><div className="snapshot-list"><div><span>Completed conversations</span><strong>{calls.length}</strong></div><div><span>Total talk time</span><strong>{formatDuration(totalDuration)}</strong></div><div><span>Agents ready</span><strong>{agents.length}</strong></div><div><span>Average sentiment sample</span><strong>{calls.length ? "Available" : "Waiting for data"}</strong></div></div></section></div><p className="analytics-footnote">Analytics are calculated from demo calls saved during the current API process. The Overview page contains illustrative starter metrics where no real data is available.</p></div>;
}
